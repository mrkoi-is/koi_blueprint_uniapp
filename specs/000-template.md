# Feature: concise name

## Outcome

What observable change does the user receive?

## Scope

### In

- ...

### Out

- ...

## Target matrix

| Target      | Required behavior | Explicit difference or fallback |
| ----------- | ----------------- | ------------------------------- |
| H5          | ...               | ...                             |
| `mp-weixin` | ...               | ...                             |

State whether the optional `profiles/weixin-ai-alpha/` capability is selected.
Stable is the default.

## Pages and navigation

- Added or changed `pages.json` routes:
- Main package or subpackage:
- Entry parameters and return path:
- Loading, empty, error, and ready UI states:

## States and transitions

| Current | Intent/event | Next    | Side effect               |
| ------- | ------------ | ------- | ------------------------- |
| idle    | user starts  | loading | invoke use case           |
| loading | success      | ready   | none                      |
| loading | failure      | error   | record recoverable reason |

## Domain and contracts

- Types and invariants:
- Application use cases:
- API DTO mapping:
- Pinia state:
- Platform ports and adapters:
- Runtime capability checks:

Business code must depend on a platform contract rather than directly on a
host-specific global.

## Data and configuration

- Endpoints or storage keys:
- Environment variables:
- Migration or compatibility behavior:
- Secrets that must remain server-side:

## Failure and recovery

- Expected failures:
- User-visible recovery:
- Retry/idempotency behavior:
- Offline or unsupported-platform behavior:

## Acceptance

- Given ..., when ..., then ... on H5.
- Given ..., when ..., then ... on `mp-weixin`.
- Given a platform capability is unavailable, when ..., then the declared
  fallback occurs.
- Generated-project, architecture, route, and package-budget checks remain
  green.

## Verification

Focused iteration:

```bash
npm run test -- <focused-test>
npm run validate:fast
```

Completion:

```bash
npm run validate:fast
npm run build:h5
npm run build:mp-weixin
npm run validate
```

Record any intentionally deferred runtime or real-device case here:

- ...
