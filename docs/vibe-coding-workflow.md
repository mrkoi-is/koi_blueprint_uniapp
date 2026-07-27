# Vibe Coding Workflow

Vibe coding works when intent can evolve while specifications, boundaries, and
evidence remain explicit.

## Durable loop

1. **Specify** — create or update one short active file under `specs/`.
2. **Select a profile** — leave the profile as Stable unless the user and spec
   explicitly select `weixin-ai-alpha`.
3. **Route** — inspect `.agent/skills/index.yaml` and load only the matched
   Skill files.
4. **Slice** — implement the smallest end-to-end behavior that changes a user
   outcome.
5. **Check fast** — run the narrowest test while iterating, then
   `npm run validate:fast`.
6. **Build both** — run `npm run build:h5`, then
   `npm run build:mp-weixin`.
7. **Observe** — use H5, WeChat DevTools, the AI Alpha runtime, or a real device
   for behavior the automated layer cannot prove.
8. **Record** — add an ADR only when the decision changes a durable boundary.

## Spec contract

A useful spec states:

- the user problem and observable outcome;
- in-scope and out-of-scope behavior;
- `profile: stable` or the explicitly selected
  `profile: weixin-ai-alpha`;
- page states and transitions;
- domain types and invariants;
- API and semantic platform ports;
- failure, cancellation, resume, and recovery paths;
- Given/When/Then acceptance scenarios;
- focused and final verification commands.

The spec describes contracts and outcomes, not every implementation line.

## Profile contract

Stable is the default:

- use the pinned DCloud cohort;
- keep shared behavior portable across H5 and `mp-weixin`;
- isolate `uni.*`, browser globals, and direct `wx.*` under their platform
  directories.

Weixin AI Alpha is optional:

- load `weixin-ai-profile` and `profiles/weixin-ai-alpha/` only after explicit
  selection;
- keep the official `mp-weixin.agent.instruction`,
  `mp-weixin.agent.pageMetadata`, and `mp-weixin.agent.skills` manifest keys;
- resolve those paths relative to `src/manifest.json`;
- use only WeChat-native components inside an AI Skill's `components`;
- fail visibly if the requested profile cannot be applied or verified.

H5 can catch shared regressions; it cannot prove Weixin AI Agent behavior.

## Context budget

Use progressive disclosure:

```text
AGENTS.md
  → .agent/skills/index.yaml
    → active spec
      → matched Skill files
        → relevant source and tests
          → architecture/Profile detail only when triggered
```

Do not preload the repository, all Skills, or both profiles. Search for exact
symbols and boundaries before opening large files. Store durable knowledge in
the repository instead of repeatedly pasting it into prompts.

## Implementation shape

- Keep pages thin and Features cohesive.
- Keep model/use-case code framework-independent.
- Express platform needs as semantic ports and inject concrete adapters from
  the bootstrap composition root.
- Validate remote and persisted data before it reaches domain code.
- Prefer an explicit state machine or discriminated union over boolean piles.
- Pair each failure path with an observable recovery path.
- Extend deterministic architecture checks when adding a durable rule.

## Verification contract

Before claiming an implementation complete, run:

```bash
npm run validate:fast
npm run build:h5
npm run build:mp-weixin
```

Run `npm run check:mp-budget` when Mini Program output changes, or use
`npm run validate` for the full local/CI aggregate after the fast feedback loop.

Every completion claim names:

- the accepted behavior that changed;
- the selected profile;
- the exact checks that passed;
- remaining DevTools, Alpha-runtime, permission, lifecycle, or real-device
  evidence.

Preview, upload, publication, and production credentials are separate explicit
workflows.
