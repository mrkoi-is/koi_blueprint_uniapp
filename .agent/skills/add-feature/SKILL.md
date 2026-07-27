---
name: add-feature
description: Add or change a spec-first feature slice in the uni-app Vue 3 blueprint. Use when creating a business module, route page, user workflow, state transition, or other user-facing capability.
---

# Add Feature

## Workflow

1. Read the active spec. If a behavior change has no spec, create one from
   `specs/000-template.md` and define states, failures, recovery, acceptance,
   and the selected profile.
2. Keep Stable unless the spec explicitly names `weixin-ai-alpha`. When it
   does, load `weixin-ai-profile` before touching profile files.
3. For a new slice, generate the collision-safe starting point:

   ```bash
   npm run scaffold:feature -- <feature-name> <page-name>
   ```

4. Define framework-independent model values, invariants, semantic ports, and
   use cases under `src/features/<feature>/`.
5. Put reusable Feature presentation in its local `components/`. Keep
   `src/pages/` thin: handle uni-app lifecycle, translate user intent, and
   render explicit loading, empty, ready, and error states.
6. Validate remote/storage/route data at the boundary before the use case
   consumes it.
7. Export the smallest stable cross-Feature surface from `public.ts`.
8. Wire concrete repositories and platform adapters only in `src/bootstrap/`.
9. Add focused tests for the state transitions and recovery behavior in the
   spec.
10. Run the focused test, then:

```bash
npm run validate:fast
npm run build:h5
npm run build:mp-weixin
```

## Boundaries

- Do not create global business `services/`, `api/`, `types/`, or component
  dumping grounds.
- Do not deep-import another Feature; use its `public.ts` only when the
  dependency is truly stable.
- Do not put `uni.*`, `wx.*`, browser globals, or conditional compilation in
  Feature model/use-case code.
- Keep page-local drafts and loading state local. Add Pinia state only for
  clearly owned cross-page state.
- Consider a business subpackage only after route frequency and package
  measurements justify it.
