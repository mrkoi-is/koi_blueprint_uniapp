# Architecture audit: uni-app open-source Top 10

## Outcome

Audit ten relevant open-source uni-app application starters or reference
projects and improve the Stable blueprint with evidence-backed practices that
increase reproducibility, cross-platform correctness, and AI-assisted
development quality without turning the skeleton into a dependency showcase.

## Scope

### In

- Rank ten repositories using relevance, maintenance, adoption, engineering
  evidence, cross-target verification, and reusable architecture.
- Inspect source configuration and quality scripts rather than relying only on
  README claims or star counts.
- Record retained, adapted, and rejected practices with source links and an
  audit date.
- Implement only improvements that fit the blueprint's minimal Stable
  contract.
- Add or extend deterministic checks for every new durable rule.

### Out

- Copying a complete third-party template or UI framework.
- Adding targets beyond H5 and `mp-weixin`.
- Enabling the Weixin AI Alpha runtime profile.
- Publishing, pushing, or changing remote repositories.

## Target matrix

| Target      | Required behavior                                       | Explicit difference                       |
| ----------- | ------------------------------------------------------- | ----------------------------------------- |
| H5          | Existing production build and shared checks stay green  | Browser output only                       |
| `mp-weixin` | Existing production build and package budget stay green | DevTools remains a separate runtime check |

Profile: Stable.

## Audit scoring

Score each candidate from 0–5 on:

1. runnable application-skeleton completeness;
2. architecture boundaries and maintainability;
3. cross-target build evidence;
4. executable tests and CI;
5. current maintenance and toolchain clarity;
6. documentation, reuse, and agentic/vibe-coding value.

Record stars and forks as a dated adoption signal, but do not add them directly
to the score. This prevents popularity from hiding missing tests, stale
dependencies, or H5-only CI.

Repositories that are abandoned, Vue 2-only, UI-library-only, or lack
inspectable application structure may be cited as context but cannot occupy a
Top 10 slot without an explicit reason.

## Acceptance

- Ten repositories have verified source URLs, audit-date metadata, source-level
  architecture evidence, scores, strengths, and limitations.
- Each adopted change maps to evidence from an official source or at least two
  reviewed projects.
- Rejected popular patterns are documented with a concrete reason.
- Stable DCloud cohort pinning and H5 + `mp-weixin` dual builds remain intact.
- New durable rules have deterministic checks.
- Generated-project smoke validation, unit tests, coverage, both target builds,
  and the Mini Program package budget pass.

## Verification

```bash
npm run validate:blueprint
npm --prefix skeleton run validate:fast
npm --prefix skeleton run build:h5
npm --prefix skeleton run build:mp-weixin
npm --prefix skeleton run check:mp-budget
npm run validate
```
