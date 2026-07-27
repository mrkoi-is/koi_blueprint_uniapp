# Testing strategy

The blueprint uses fast deterministic checks for most feedback and reserves
runtime automation for behavior that only a target environment can prove.

## Root acceptance gate

From the blueprint root:

```bash
npm run validate
```

The root command proves four things:

1. the Top 10 evidence snapshot and its decision mappings are internally
   consistent;
2. the blueprint contains the required uni-app and collaboration assets;
3. the generator handles clean output, dry-run, collision refusal, force
   overwrite without deletion, and `--no-ai-assets`;
4. a fresh temporary project can install from its lockfile, scaffold a Feature,
   reject a duplicate scaffold, and pass its complete validation pipeline.

`npm run validate:blueprint` runs the audit, structure, and generator contract
without dependency installation or target builds. `npm run validate:skeleton`
runs only the checked-in application gate. `npm run check:audit` and
`npm run check:generator` expose the two durable root contracts independently.

## Skeleton validation layers

The skeleton's `npm run validate` executes:

1. `format:check` — source and configuration formatting;
2. `typecheck` — Vue and TypeScript contracts through `vue-tsc`;
3. `lint` — code-quality and boundary-friendly static rules;
4. DCloud cohort, public env, architecture, route, and optional-profile checks;
5. unit tests;
6. coverage thresholds;
7. production H5 and `mp-weixin` builds;
8. the compiled Mini Program package-budget check.

During implementation, prefer the narrowest useful command:

```bash
npm run test -- tests/unit/runtime-config.test.ts
npm run validate:fast
npm run build:h5
npm run build:mp-weixin
```

Run these commands inside a generated project or prefix them with
`npm --prefix skeleton` when working from the blueprint root.

## Unit and contract tests

Vitest is the default fast runner. Keep most tests independent of a rendered
target:

- domain invariants and state transitions;
- application use cases;
- DTO mapping and remote-error normalization;
- runtime configuration and invalid public env input;
- Pinia store actions;
- contracts shared by H5 and Mini Program adapters;
- HTTP URL/body/header mapping, 2xx, non-2xx, timeout, and network failure.

Code outside `src/platform/` should receive platform capabilities through
ports. Tests provide explicit fakes for those ports; they must not silently
fall back to a live runtime.

Platform adapter tests may stub the minimal `uni` surface they own. Reset the
stub after every test so one platform case cannot leak into another.

## Build and target checks

Both production builds are mandatory:

```bash
npm run build:h5
npm run build:mp-weixin
```

Expected outputs:

```text
dist/build/h5/
dist/build/mp-weixin/
```

The route check validates `src/pages.json` against Vue page files, rejects path
escape, overlapping subpackage roots, subpackage TabBar entries, and invalid
preload references. The package budget check measures the compiled
`mp-weixin` main package and each subpackage independently, then reports total
output against its own limit; it never substitutes source estimates.
Generated `dist/`, `coverage/`, and `unpackage/` directories are disposable and
must not be edited or committed.

## Runtime automation

Add a small runtime suite only for flows whose result depends on rendering,
navigation, lifecycle, permissions, or host behavior:

- use browser automation for critical H5 journeys;
- use DCloud `uni-automator` for selected H5/Weixin parity journeys;
- keep real-device cases for permissions, payment, camera/media, keyboard,
  safe-area, and lifecycle restoration.

Runtime suites should cover a few high-value journeys. Keep the broad test
pyramid in pure TypeScript so AI-assisted iterations remain quick and
diagnosable.

## Optional Weixin AI profile

When a spec selects `profiles/weixin-ai-alpha/`, validation must additionally
prove:

- the complete DCloud dependency cohort was switched together;
- `mp-weixin.agent` has the required instruction, page metadata, and Skill
  declarations;
- referenced files exist relative to `src/manifest.json`;
- H5 exposes an explicit alternative or unsupported capability;
- both normal target builds still pass.
