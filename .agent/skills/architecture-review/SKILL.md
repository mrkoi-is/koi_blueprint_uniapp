---
name: architecture-review
description: Review the uni-app blueprint or a generated project against Koi architecture and quality boundaries. Use for audits, refactors, dependency drift, platform leakage, profile misuse, state ownership, package growth, or blueprint conformance.
---

# Architecture Review

## Evidence

Inspect:

- the active specs and only ADRs relevant to the reviewed boundary;
- `package.json`, lockfile, `renovate.json`, Vite/TypeScript config,
  `.env.example`, `src/manifest.json`, and `src/pages.json`;
- DCloud cohort alignment and whether Stable remains the default;
- imports under `src/bootstrap`, `src/core`, `src/features`, `src/pages`,
  `src/platform`, `src/shared`, and `src/stores`;
- every `uni.*`, direct `wx.*`, browser global, conditional-compilation marker,
  and direct transport call;
- Feature state ownership, public contracts, DTO validation, mock selection,
  and recovery paths;
- H5 and `mp-weixin` build evidence, tests, generated-output policy, and
  separate main/subpackage reports;
- `docs/research/` only when a claim depends on an ecosystem audit, checking
  fixed commit evidence rather than current README prose;
- `profiles/weixin-ai-alpha/` only when the spec or reviewed change explicitly
  selects it.

Run:

```bash
npm run validate:fast
npm run build:h5
npm run build:mp-weixin
npm run check:mp-budget
```

Do not claim a build passed unless it was actually run.

## Output

Report findings by impact with exact file paths and evidence. Separate:

- enforced violations;
- design risks supported by evidence;
- optional evolution that lacks current pressure.

Name the selected profile and distinguish H5/compiler evidence from WeChat
DevTools, Alpha runtime, and real-device evidence. If asked to fix a durable
rule, update its deterministic machine gate in the same change.
