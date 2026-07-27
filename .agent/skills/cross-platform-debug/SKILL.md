---
name: cross-platform-debug
description: Diagnose and fix behavior that differs between uni-app H5 and mp-weixin. Use for target-specific compile failures, rendering, lifecycle, permissions, routing, safe areas, assets, platform API leakage, or bugs that reproduce on only one target.
---

# Cross-Platform Debug

## Workflow

1. Read the active spec and record a two-target reproduction matrix:
   environment, input, expected result, H5 result, `mp-weixin` result, and the
   smallest reliable reproduction.
2. Run `npm run validate:fast` before changing code. Preserve the first useful
   compiler/runtime error instead of debugging cascaded symptoms.
3. Classify the failure:
   - shared model/use-case defect;
   - uni-app compiler or dependency-cohort mismatch;
   - platform capability/permission/lifecycle difference;
   - H5 DOM/browser behavior;
   - WeChat-only runtime behavior;
   - asset, route, style, or package-output difference.
4. Search only the affected symbols and platform boundaries. Check for:
   - `uni.*` outside `src/platform/`;
   - browser globals outside `src/platform/h5/`;
   - direct `wx.*` outside `src/platform/mp-weixin/`;
   - target conditionals outside platform code or `App.vue`;
   - Feature/page code depending on concrete adapters.
5. Fix the shared semantic contract first. Isolate unavoidable target behavior
   behind `platform/uni`, `platform/h5`, or `platform/mp-weixin` and inject it
   from the bootstrap composition root.
6. Add the lowest deterministic regression test that fails before the fix.
   Keep a DevTools/real-device case when automation cannot prove the behavior.
7. Run, in order:

   ```bash
   npm run validate:fast
   npm run build:h5
   npm run build:mp-weixin
   ```

8. Inspect both produced targets. Use WeChat DevTools or a real device for
   permissions, payment, media, background lifecycle, renderer, and other
   device-owned behavior.

## Output

Report the root cause, affected boundary, regression evidence, both build
results, and remaining runtime checks. Do not label a fallback as a fix.

If Weixin AI Alpha is explicitly selected, also load `weixin-ai-profile`.
Never silently replace unavailable Alpha behavior with Stable or an H5
simulation.
