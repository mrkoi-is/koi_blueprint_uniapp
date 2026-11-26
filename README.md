# koi_blueprint_uniapp

[![Validate blueprint](https://github.com/mrkoi-is/koi_blueprint_uniapp/actions/workflows/ci.yml/badge.svg)](https://github.com/mrkoi-is/koi_blueprint_uniapp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.13%20%3C25-brightgreen.svg)](.nvmrc)

[中文文档](README_ZH.md)

A small, executable uni-app blueprint for Vue 3, TypeScript, Vite, Pinia, H5,
and WeChat Mini Program. It is designed for AI-assisted development without
turning a starter into a framework collection.

## Stable by default

The stable profile provides:

- one feature codebase compiled to H5 and `mp-weixin`;
- Vue single-file pages with strict TypeScript;
- small Feature modules instead of mandatory multi-layer DDD;
- centralized HTTP, typed public configuration, and dependency composition;
- tested HTTP success, status, timeout, and network-failure semantics;
- `uni.*`, `wx.*`, and browser-global isolation at platform boundaries;
- deterministic scaffolding, path-safe routes, and separate main/subpackage
  budgets;
- Spec → Skill → thin slice → verification as the vibe-coding loop.

`profiles/weixin-ai-alpha/` is an optional, explicit experiment profile carried
with each generated project. Its templates are never imported or enabled by the
stable runtime. A project that opts in must keep business Features behind narrow ports, preserve an H5
unsupported/fallback path, and still pass the stable dual-build gate.

## Local development

Install the app dependencies with `npm --prefix skeleton ci`, then run `npm run doctor`
from the blueprint root. Use `npm run doctor -- --weixin` for the WeChat CLI,
`npm run check:mcp` for offline configuration checks and `npm run check:mcp -- --live`
to test tool calls. [Local setup and client diagnostics](skeleton/LOCAL_DEVELOPMENT.md)

## Quick start

Validate a freshly generated project from the blueprint root:

```bash
npm run validate
```

For the fast audit, structure, and generator contract only:

```bash
npm run validate:blueprint
```

Develop the checked-in skeleton directly:

```bash
cd skeleton
npm ci
npm run validate
```

Run one target while developing:

```bash
npm run dev:h5
npm run dev:mp-weixin
```

Open `dist/dev/mp-weixin` in WeChat DevTools after starting the Mini Program
build. Production builds are written to `dist/build/h5` and
`dist/build/mp-weixin`.

Create a project:

```bash
node scripts/apply-skeleton.mjs ../my-uni-app \
  --name my-uni-app \
  --title "My App"

cd ../my-uni-app
npm ci
npm run validate
```

The generator also supports `--dry-run`, `--force`, and `--no-ai-assets`.
The last option omits editor-agent bridges, Skills, consumer docs, and the spec
template. Normal generation distributes only consumer-facing AI context, not
the blueprint's own audit or active build specs.

Generated projects include the `author-agent-docs` Skill for specs, handoffs,
and maintaining project Skills. In Codex invoke `$author-agent-docs`; in Claude
Code use `/author-agent-docs`. [Agent quickstart](docs/ai-quickstart.md) ·
[MCP setup and verification](docs/agent-mcp.md) · [Community audit](docs/agent-tooling-audit.md)

Copy `.env.example` to a local `.env` to override the public local, staging,
and production API base URLs or the request timeout. `VITE_*` values are
bundled into the client and must never contain credentials.

## Minimal Feature shape

```text
src/
  features/orders/
    model.ts
    use-orders.ts
    public.ts
  pages/orders/index.vue
tests/unit/orders.test.ts
```

Add `orders.api.ts`, components, or a Feature-owned Pinia store only when the
behavior needs them. Pages render state and forward intent; pure workflow and
business decisions remain testable without Vue or a platform runtime.

Generate the starting slice:

```bash
npm run scaffold:feature -- orders index
npm run validate:fast
```

## Verification contract

`npm run validate` is the local and CI source of truth:

```text
format → typecheck → lint → compiler-cohort and env checks
→ architecture/routes → unit tests and coverage
→ H5 build → mp-weixin build → main/subpackage/total budgets
```

The evidence-backed 2026 open-source ranking and adoption map are in
`docs/open-source-top10-audit.md`; `npm run check:audit` validates its canonical
snapshot.

See `docs/architecture/ARCHITECTURE.md`,
`docs/vibe-coding-workflow.md`, and `docs/PROJECT_PLAN.md`.

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the setup, the spec-driven
change workflow, and the generator contract. Participation is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md); report vulnerabilities privately as
described in [`SECURITY.md`](SECURITY.md).

## License

[MIT](LICENSE) © mrkoi. Generated projects receive their own `LICENSE` file
whose copyright line is instantiated from the project title — review it before
publishing your application.
