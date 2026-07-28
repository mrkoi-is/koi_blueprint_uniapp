# Contributing

Keep the blueprint tooling, generated uni-app skeleton, documentation, and
agent instructions aligned. A contribution is complete only when a generated
project and the checked-in skeleton remain reproducible.

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
Report security vulnerabilities privately as described in
[`SECURITY.md`](SECURITY.md); never file them as public issues. Bugs and
proposals start as GitHub issues using the provided templates; substantial
changes then follow the spec workflow below before a pull request is opened.

## Set up

Use the Node version in `.nvmrc`, then run the generated-project acceptance
gate:

```bash
npm run validate
```

The blueprint root intentionally has no runtime dependencies. Its scripts use
Node.js directly; application dependencies belong to `skeleton/`.
For focused work on the checked-in skeleton, run `npm ci --prefix skeleton`
once before the prefixed commands below.

## Change workflow

1. Start with a short acceptance-oriented spec under `specs/`.
2. Read `AGENTS.md` and load only the task-relevant entries from
   `.agent/skills/index.yaml`.
3. Update an ADR when a durable boundary or platform decision changes.
4. Make the smallest coherent change.
5. Run a focused skeleton check while iterating.
6. Run `npm run validate` from the blueprint root before requesting review.

Use these focused commands when useful:

```bash
npm run validate:blueprint
npm run validate:skeleton
npm --prefix skeleton run validate:fast
npm --prefix skeleton run test -- <test-file>
npm --prefix skeleton run build:h5
npm --prefix skeleton run build:mp-weixin
```

## Generator changes

`scripts/apply-skeleton.mjs` is a non-destructive copier:

- it replaces `{{PROJECT_NAME}}` and `{{PROJECT_TITLE}}`;
- it never installs packages or initializes Git;
- it never deletes extra target files;
- it excludes dependencies and generated outputs such as `node_modules/`,
  `dist/`, `coverage/`, and `unpackage/`.

When changing generated inputs, update the generator contract assertions in
`scripts/check-generator-contract.mjs`. The root validation command creates a
temporary project and proves required files, token replacement, edge options,
Feature scaffolding, dependency installation, tests, both targets, and package
budgets. Blueprint-only research and active build specs must not leak into the
consumer project.

## Dependency updates

Keep the DCloud compiler packages as one exact-version cohort. Use the official
version manager for a deliberate cohort update, inspect the resulting
`package.json`, regenerate `skeleton/package-lock.json`, and run both target
builds. Do not independently float a single `@dcloudio/*` compiler package.
`renovate.json` groups the compiler and verified peers into one review; keep
the root and generated-project copies identical.

The optional `profiles/weixin-ai-alpha/` profile does not change the stable
default. Select it only in a spec that explicitly requires the Weixin runtime
AI development mode.

## Do not commit

- `node_modules/`, `dist/`, `coverage/`, `unpackage/`, or `.vite/`;
- private upload keys or service credentials;
- production credentials, tokens, or `.env` files;
- `project.private.config.json`;
- generated files edited by hand.

Keep changes local and verification-focused unless a separate task explicitly
authorizes publishing or another external action.
