---
name: project-init
description: Create a new Koi uni-app Vue 3 project from the blueprint skeleton. Use for bootstrap, initialization, dry-run generation, or optionally applying the explicitly selected Weixin AI Alpha profile.
---

# Project Init

## Inputs

- target directory;
- npm-safe project name;
- visible application title;
- profile: Stable by default, or explicitly `weixin-ai-alpha`.

Do not request or write production AppIDs, upload private keys, or service
credentials during scaffolding.

## Workflow

1. Confirm the inputs and active spec. Keep Stable when no profile was
   explicitly selected.
2. Run the generator from the blueprint checkout (it lives at
   `scripts/apply-skeleton.mjs` there). From an already generated app, locate
   that checkout first. Preview the generated files:

   ```bash
   node scripts/apply-skeleton.mjs <target> \
     --name <slug> \
     --title "<title>" \
     --dry-run
   ```

3. Inspect the plan and confirm no `.git`, dependency directory, build output,
   local private config, or key material will be copied. Then rerun without
   `--dry-run`.
4. In the generated target run:

   ```bash
   npm ci
   npm run validate:fast
   npm run build:h5
   npm run build:mp-weixin
   ```

5. If `weixin-ai-alpha` was explicitly selected, load
   `weixin-ai-profile` and follow the application and verification instructions
   owned by `profiles/weixin-ai-alpha/`. Apply it after the Stable skeleton is
   healthy; never make Alpha an implicit default.
6. Open `dist/dev/mp-weixin` or the production Mini Program output in WeChat
   DevTools as appropriate. Use the H5 build for shared regression evidence.
7. Record only durable deviations from the baseline as ADRs.

## Completion

Report the target path, selected profile, exact checks, and remaining DevTools,
Alpha-runtime, or device validation. Do not upload or publish.
