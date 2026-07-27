# Weixin AI development profile (optional Alpha)

This profile is for Weixin Mini Program's runtime AI development mode. It is
separate from the repository's editor-agent workflow under `.agent/skills/`.

The default project stays on the stable DCloud cohort and builds both H5 and
`mp-weixin`. Enable this profile only when the runtime AI mode is a confirmed
requirement:

uni-app Vue 3 support for this mode requires compiler/HBuilderX 5.21 or newer.
At the verified 2026-07-27 baseline, that capability is on the Alpha channel;
check the current official release notes again when enabling it.

1. Record the capability and fallback behavior in a spec.
2. Switch the complete DCloud dependency cohort with the official version
   manager:

   ```bash
   npx @dcloudio/uvm@latest alpha
   npm install
   npm run check:dcloud-cohort
   ```

3. Merge `manifest.agent.fragment.json` into `src/manifest.json`. Replace the
   example App ID, Skill name, description, and path.
4. Create `src/AGENTS.md`, `src/page-meta.json`, and every declared Skill under
   `src/ai-packages/`. Paths are relative to `src/manifest.json`.
5. Follow Weixin's current Skill and MCP schemas. Components placed inside a
   runtime AI Skill must use native Weixin Mini Program component files; the
   surrounding application remains uni-app.
6. Keep business code behind a platform capability contract. H5 must expose an
   explicit unsupported or alternative implementation, never an accidental
   `wx.*` call.
7. Run:

   ```bash
   npm run validate:fast
   npm run build:h5
   npm run build:mp-weixin
   npm run check:mp-budget
   ```

   `npm run validate` remains the aggregate local/CI gate.

Do not copy an Alpha version string from this profile. Use `uvm` so every
`@dcloudio/*` compiler package moves as one cohort, then commit the regenerated
lockfile.

Official references:

- <https://uniapp.dcloud.net.cn/tutorial/mp-weixin-ai-develop.html>
- <https://uniapp.dcloud.net.cn/quickstart-cli.html>
- <https://developers.weixin.qq.com/miniprogram/dev/ai/guide.html>
