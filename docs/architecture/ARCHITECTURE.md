# Koi uni-app Architecture

## 1. Goals

The blueprint optimizes for:

1. one maintainable Vue 3 codebase for H5 and WeChat Mini Program;
2. short, deterministic feedback for humans and coding agents;
3. business behavior testable without a browser, DevTools, or `uni`;
4. explicit platform, HTTP, storage, configuration, and state ownership;
5. progressive growth without starting from a monorepo or ceremonial DDD.

The framework decision is recorded in
`docs/adr/0001-uni-app-h5-mp-weixin.md`.

## 2. Profiles

### Stable

Stable is the default and the only universal contract:

- targets: H5 and `mp-weixin`;
- runtime: uni-app, Vue 3, Pinia, and strict TypeScript;
- build: Vite through the official uni-app CLI;
- host access: shared `uni.*` adapters under `src/platform/uni/`;
- acceptance: both targets build from the same source tree.

Stable installs only the two committed targets. It does not include App,
uniCloud, a UI suite, SSR, Vue Router, Axios, or preview WeChat AI APIs.

### Weixin AI Alpha

`profiles/weixin-ai-alpha/` is an opt-in experiment pack. It carries activation
instructions and templates; Stable runtime code must not import it.

Activation requires an explicit Spec or ADR that names the capability, current
platform prerequisites, fallback behavior, and verification evidence. Feature
code depends on a narrow semantic port rather than `wx.*` or a preview SDK.
The profile must provide an H5 unsupported/fallback implementation and cannot
weaken `npm run validate`. DevTools and real-device evidence supplement, but do
not replace, the Stable dual build.

## 3. Source model

```text
src/
├── App.vue
├── main.ts                       createSSRApp + Pinia
├── manifest.json                 H5 and mp-weixin configuration
├── pages.json                    route registry
├── uni.scss                      shared tokens and global styles
├── bootstrap/
│   └── container.ts              concrete dependency wiring only
├── core/
│   ├── config/                   typed runtime configuration
│   ├── feedback/                 user-feedback port
│   └── http/                     transport contract and error model
├── features/
│   └── home/
│       ├── model.ts              values and ports
│       ├── use-home.ts           framework-free workflow
│       ├── home.api.ts           optional DTO mapping/repository
│       ├── components/           Feature-owned UI
│       └── public.ts             stable cross-Feature contract
├── pages/
│   └── home/index.vue            lifecycle and UI orchestration
├── platform/
│   ├── uni/                      shared uni-app adapters
│   ├── h5/                       browser-only adapters, when required
│   └── mp-weixin/                WeChat-only adapters, when required
├── shared/                       business-neutral UI and helpers
└── stores/                       truly application-wide Pinia state
```

Dependency direction:

```text
page → bootstrap/application service → Feature model and workflow
                                      ↓
                               Feature API/port
                                      ↓
                              core HTTP contract
                                      ↑
                             platform implementation
```

`bootstrap/container.ts` is the composition root. It may know Features and
concrete adapters at the same time, but it contains no product decisions.

## 4. Minimal Feature contract

Start with the smallest slice:

```text
features/<feature>/
  model.ts
  use-<feature>.ts
  public.ts
pages/<feature>/<page>.vue
tests/unit/<feature>.test.ts
```

Add an API file, components, a store, or deeper folders only after real
pressure appears. Do not scaffold empty `domain/application/data` layers.

Rules:

- `model.ts` and `use-*.ts` do not import Vue, Pinia, uni-app, platform
  adapters, or the composition root.
- Pages own lifecycle and view state, render loading/empty/ready/error, and do
  not call HTTP or platform adapters directly.
- API files own endpoint paths, untrusted DTO checks, and DTO-to-model mapping.
- Cross-Feature imports use only the target Feature's `public.ts`.
- `core`, `platform`, `shared`, and global stores cannot import Feature
  internals.

Generate and verify a slice:

```bash
npm run scaffold:feature -- orders index
npm run validate:fast
```

## 5. State ownership

Use local Vue state for transient UI and page workflows. Use a Feature-owned
Pinia store only when state must survive page instances or be shared by several
pages. Use `src/stores/` only for truly application-wide state.

Persist only named, versioned fields through a storage adapter; do not persist
an entire store by default. Server-owned identity, payment, entitlement, jobs,
and generated content remain server truth. Client callbacks and local flags do
not prove durable success.

## 6. Platform boundary

- `uni.*` is allowed only under `src/platform/`.
- `wx.*` is allowed only under `src/platform/mp-weixin/`.
- `window`, `document`, `localStorage`, and `sessionStorage` are allowed only
  under `src/platform/h5/`.
- Platform conditionals belong in `src/platform/` or the application shell.
- Page lifecycle imports from `@dcloudio/uni-app` are lifecycle declarations,
  not platform adapters.

Prefer a shared `uni.*` implementation. Split H5 and WeChat implementations
only when behavior is materially different. Expose small capabilities such as
feedback, session, media picking, storage, payment, or AI availability; do not
mirror an entire host namespace.

## 7. HTTP and configuration

All requests pass through the typed HTTP contract in `src/core/http/` and a
platform implementation under `src/platform/uni/`.

The transport owns base URL, timeout, headers, request lifecycle, and
status-to-error mapping. A Feature API owns endpoint paths, DTO validation,
domain mapping, and mutation retry/idempotency decisions. Mocks are explicit
repository choices and never a silent network-error fallback.

Build configuration is typed. `.env.example` documents the public contract for
the three API base URLs and request timeout; `check:env` prevents drift between
that example and `ImportMetaEnv`. The runtime resolver validates URLs and
numeric bounds before constructing services. `VITE_*` values are embedded in
client bundles and contain no secrets; private API keys and model credentials
belong behind a backend boundary.

The uni-app HTTP adapter exposes a narrow injectable request executor. Tests
prove URL/body/header mapping, 2xx success, status mapping, timeout, and network
failure without making live requests or letting `uni.*` escape the platform
directory.

## 8. Build model

The CLI compiler produces disposable target trees:

```text
dist/dev/mp-weixin
dist/build/h5
dist/build/mp-weixin
```

Run:

```bash
npm run dev:h5
npm run dev:mp-weixin
npm run build:h5
npm run build:mp-weixin
```

All DCloud compiler packages use one exact release cohort. Vue, Vite, Pinia,
TypeScript tooling, and the compiler are upgraded as a tested group rather than
independently. `renovate.json` proposes the compiler and verified runtime peers
in one review; `check:dcloud-cohort` remains the executable compatibility gate
and rejects partial or independently floated results.

Start with one application repository. Add a subpackage only for a measured
Mini Program package need. The compiled budget gate classifies output from
`pages.json.subPackages`, applies separate safety budgets to the main package
and each subpackage, and applies a separate total-output budget. It does not
confuse total output with main-package size. Add a workspace package only after
a second real consumer exists.

## 9. Verification and vibe coding

Fast iteration:

```bash
npm run validate:fast
```

Completion gate:

```bash
npm run validate
```

The full gate checks formatting, types, lint, compiler cohesion, public env,
architecture, path-safe routes, unit coverage, both production builds, and the
Mini Program main/subpackage budgets.

The durable AI workflow is:

1. Frame the user outcome and acceptance cases in one short `specs/` file.
2. Route through `.agent/skills/index.yaml` and load only matched Skills.
3. Implement the thinnest end-to-end Feature slice.
4. Run a focused test while iterating.
5. Run `npm run validate` before claiming completion.
6. Record an ADR only for a lasting boundary decision.

DevTools or real-device checks are required when behavior depends on
permissions, payment, camera/media, keyboard, safe area, lifecycle, or an Alpha
profile. Report those checks separately from automated evidence.

## 10. Evolution

| Pressure                        | Add                                             |
| ------------------------------- | ----------------------------------------------- |
| State spans several pages       | A Feature-owned typed Pinia store               |
| API contract stabilizes         | Generated DTOs in a generated-only directory    |
| Main package approaches budget  | Business-domain subpackages                     |
| A second app consumes contracts | A workspace package                             |
| Long-running remote work        | A persisted task state machine and resume tests |
| Preview WeChat AI experiment    | Explicit `profiles/weixin-ai-alpha/` activation |

Every lasting rule must gain a machine check in the same change.
