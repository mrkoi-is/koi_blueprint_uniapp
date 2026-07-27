---
name: testing-scaffold
description: Add the narrowest valuable evidence for a uni-app acceptance scenario. Use for Vitest tests, architecture contracts, DTO mapping, Vue component behavior, H5 browser checks, WeChat DevTools automation, AI Alpha validation, or real-device acceptance.
---

# Testing Scaffold

Choose the lowest layer that can prove the behavior:

1. Model/use-case/repository mapping → Vitest without Vue or platform globals.
2. Dependency, DCloud cohort, route, manifest, or package rule →
   deterministic Node check.
3. Vue component props/events/state → focused component test using the
   project's installed test surface.
4. H5 rendering, keyboard, browser lifecycle, or shared journey → browser
   automation against the H5 build.
5. WeChat navigation or a critical compiled journey → small DevTools automation
   smoke.
6. Permission, payment, camera, renderer, safe area, background lifecycle, AI
   Agent behavior, or device integration → DevTools/Alpha runtime and real
   device as required.

## Workflow

1. Copy the acceptance scenario from the active spec and express it as
   Given/When/Then.
2. Select the lowest layer that observes the claimed outcome.
3. Inject fakes through semantic ports instead of patching `uni`, `wx`, or
   browser globals in business tests.
4. Cover malformed input, cancellation/failure, and recovery when they are part
   of the contract.
5. Keep GUI automation few, deterministic, and focused on integration risk.
6. For a cross-target failure, also load `cross-platform-debug`. For Alpha
   behavior, also load `weixin-ai-profile`.
7. Run the focused test, then:

   ```bash
   npm run validate:fast
   npm run build:h5
   npm run build:mp-weixin
   ```

Never claim that a Node test, H5 build, simulator, or successful compilation
proves WeChat permission, AI Agent, or real-device behavior.
