Follow `AGENTS.md`. Use `.agent/skills/index.yaml` to load only the Skill files
matched to the active spec; `.agent/skills/` is the workflow source of truth.
Keep Stable as the default and use `profiles/weixin-ai-alpha/` only when
explicitly selected. Before marking implementation complete, run
`npm run validate:fast`, `npm run build:h5`, and
`npm run build:mp-weixin`, in that order.
