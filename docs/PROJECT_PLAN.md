# Project plan

## Phase 1 — Stable baseline

- uni-app CLI with Vue 3, TypeScript, Vite, and Pinia
- H5 and `mp-weixin` development and production builds
- exact, machine-checked DCloud compiler cohort
- minimal Feature example and deterministic Feature scaffolder
- typed HTTP/configuration and isolated platform adapters
- typed public env contract and tested HTTP transport failures
- AI quickstart, Skills, Spec, and ADR workflow
- typecheck, lint, architecture, path-safe route, unit coverage, and
  main/subpackage gates
- fixed-commit Top 10 audit with machine-checked adoption mappings
- cross-system generator contract plus fresh-output CI acceptance through
  `npm run validate`

Stable is complete only when a fresh generated project passes:

```bash
npm ci
npm run validate
```

## Phase 2 — Optional capability profiles

Add only when a consuming project has a concrete need:

- `profiles/weixin-ai-alpha/` for explicitly approved preview WeChat AI
  experiments;
- authentication/session;
- OpenAPI DTO generation;
- upload and media pipelines;
- long-running job restoration;
- H5 browser smoke tests;
- WeChat DevTools automation.

Each profile includes activation/rollback instructions, narrow platform ports,
templates, focused tests, and exact verification commands. It cannot change the
Stable skeleton implicitly or weaken the H5 + `mp-weixin` build gate.

## Phase 3 — Ecosystem

- extract shared packages only after a second consumer exists;
- publish a create package only after repeated external use justifies it;
- add migration guides from native Mini Program, Vue web, or another
  cross-platform framework;
- add more targets only as separate, tested profiles.

Publishing, credentials, upload, and release review remain outside the local
baseline.
