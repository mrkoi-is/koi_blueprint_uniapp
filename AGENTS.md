# Koi uni-app Blueprint — Agent Operating Rules

This is the small cross-tool entry point for Codex, Claude Code, Cursor,
Copilot, and compatible coding agents. Workflow instructions live only under
`.agent/skills/`; tool-specific files must route there instead of maintaining
parallel playbooks.

## Minimal read order

1. Read `.agent/skills/index.yaml`.
2. Read the active `specs/*.md`; create one from `specs/000-template.md` before
   changing product behavior when no spec exists.
3. Read only the matched `.agent/skills/<skill-id>/SKILL.md` files.
4. Inspect only source, tests, and configuration needed for the acceptance
   scenarios.

Read `docs/architecture/ARCHITECTURE.md` only when a task changes a durable
boundary. Read `profiles/weixin-ai-alpha/` only when the active spec explicitly
selects that profile. Never preload every Skill or profile.

For spec writing, acceptance handoffs, or authoring a project Skill, route to
`author-agent-docs`. For component inventory and framework documentation lookup,
use the workspace instructions in `docs/agent-mcp.md`.

## Runtime and profiles

- Runtime: uni-app, Vue 3, strict TypeScript, npm lockfile.
- Primary target: `mp-weixin`; H5 is a supported development and regression
  target.
- Default profile: **Stable**, using the exact DCloud dependency cohort pinned
  by the skeleton.
- Optional profile: **Weixin AI Alpha**, sourced from
  `profiles/weixin-ai-alpha/` and enabled only by an explicit spec/user choice.
- If Alpha was requested but its contract cannot be applied or verified, fail
  clearly. Never silently omit it, emulate it on H5, or fall back to Stable.

In this blueprint repository runtime files live under `skeleton/src/`; in a
generated project they live under `src/`. `dist/` is generated output and is
never edited by hand.

## Architecture boundaries

- Organize product behavior as feature-first vertical slices.
- Keep route pages thin: translate lifecycle and user intent into Feature use
  cases and explicit loading, ready, empty, and error states.
- Keep model and use-case code independent of Vue, Pinia, uni-app, platform
  globals, and concrete transports.
- Cross-Feature imports use the target Feature's `public.ts`; stable
  infrastructure never imports Feature internals.
- Wire concrete dependencies only in `src/bootstrap/`.
- Send remote traffic through the typed `src/core/http/` contract. Validate
  unknown payloads in the owning Feature repository before returning domain
  values.
- Put normalized `uni.*` adapters under `src/platform/uni/`; no `uni.*` call
  may escape `src/platform/`.
- Use browser globals only under `src/platform/h5/`.
- Use direct `wx.*` only under `src/platform/mp-weixin/`, and only when a
  WeChat-specific capability cannot be represented by the shared semantic
  port.
- Keep platform conditionals in platform adapters or the application shell,
  not in Features or reusable UI.

## Implementation rules

- Never use explicit `any`, `@ts-ignore`, silent `catch`, or production
  `console.log`.
- Treat props, API payloads, route parameters, storage, and platform callbacks
  as untrusted boundary input.
- Inject fakes and mocks explicitly; never make them a silent runtime fallback.
- Do not place upload private keys, session keys, service secrets, or
  production credentials in committed client source.
- Add or extend a machine check when a new durable rule is introduced.
- Record a boundary-changing decision in `docs/adr/`; avoid ADRs for local
  implementation choices.

## Execution contract

1. Restate the active spec's outcome, scope, and acceptance scenarios.
2. Route the task through `.agent/skills/index.yaml` and load the minimum Skill
   set.
3. Implement the smallest end-to-end slice.
4. Run the narrowest relevant test while iterating.
5. Before claiming implementation completion, run from the generated app (or
   `skeleton/`) in this order:

   ```bash
   npm run validate:fast
   npm run build:h5
   npm run build:mp-weixin
   ```

   From the blueprint repository root, use the equivalent
   `npm --prefix skeleton run <script>` commands.

6. Run `npm run check:mp-budget` when Mini Program output changed. The aggregate
   `npm run validate` remains the full local/CI gate.
7. Report passed checks and any behavior that still requires WeChat DevTools,
   the AI Alpha runtime, or a real device.

## Skill source of truth

`.agent/skills/index.yaml` is the routing catalog.
`.agent/skills/<skill-id>/SKILL.md` is the only authoritative workflow for that
task. `CLAUDE.md`, Copilot instructions, and Cursor rules are bridges only.
