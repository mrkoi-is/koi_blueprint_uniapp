---
name: weixin-ai-profile
description: Explicitly enable, update, or debug the optional Weixin Mini Program AI development Alpha profile for a uni-app Vue 3 project. Use for mp-weixin.agent manifest configuration, instruction or page metadata, AI Skills, Agent mode, Alpha compiler cohorts, or profiles/weixin-ai-alpha/.
---

# Weixin AI Profile

## Preconditions

1. Require an explicit user choice and an active spec with
   `profile: weixin-ai-alpha`.
2. Read only `profiles/weixin-ai-alpha/`, the active spec, and affected
   manifest/Profile files. Stable remains the default source.
3. Follow the profile's current compiler, HBuilderX/CLI, WeChat DevTools, and
   account-access prerequisites. If a prerequisite is unavailable, report it
   and stop; do not silently fall back.

## Manifest contract

Keep the Alpha configuration under the official `mp-weixin.agent` object:

- `instruction: string`;
- `pageMetadata: string`;
- `skills: Array<{ name: string; description: string; path: string }>`.

Resolve every `instruction`, `pageMetadata`, and Skill `path` relative to the
application's `src/manifest.json`. Keep
`mp-weixin.lazyCodeLoading: "requiredComponents"` unless the active profile
documents a tested reason to change it.

Do not invent alternate manifest keys or resolve paths from the repository
root, output directory, or current shell directory.

## Workflow

1. Make the Stable skeleton pass before applying the Alpha profile.
2. Apply the profile files and use DCloud's official version manager to select
   one complete Alpha dependency cohort. Review and commit the resulting
   lockfile together; never mix Stable and Alpha DCloud package versions.
3. Keep shared application and Feature code in uni-app. Put WeChat-specific
   runtime access under `src/platform/mp-weixin/`.
4. Validate each referenced instruction, page-metadata file, and AI Skill
   entry. Require each Skill directory to contain its profile-defined
   `SKILL.md`, `mcp.json`, and `index.js`. Treat a missing path, duplicate Skill
   name, or malformed file as a blocking error.
5. Inside an AI Skill's `components/`, use only native WeChat Mini Program
   custom components. Do not place Vue SFCs, uni-app components, or H5
   components there. The surrounding application may remain uni-app Vue 3.
6. Keep Alpha-specific assets and instructions out of the Stable default
   runtime unless the profile application step explicitly selects them.
7. Run:

   ```bash
   npm run validate:fast
   npm run build:h5
   npm run build:mp-weixin
   ```

8. Inspect the compiled `mp-weixin` output and test the Agent/AI Skill flow with
   the toolchain and account access required by the profile. Treat H5 only as a
   shared regression target; it cannot validate Weixin AI behavior.

## Failure rules

- Do not delete `mp-weixin.agent` fields to make a build green.
- Do not substitute a Stable dependency cohort after Alpha was requested.
- Do not emulate an AI Skill on H5 and report it as Alpha evidence.
- Do not claim production readiness from compilation alone; name the remaining
  DevTools, account, and real-runtime checks.
