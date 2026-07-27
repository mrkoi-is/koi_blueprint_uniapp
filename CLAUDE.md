# Claude Code bridge

Follow `AGENTS.md`, then route the task through `.agent/skills/index.yaml`.
Load the active spec and only the matched Skill files. `.agent/skills/` is the
workflow source of truth; do not reproduce its playbooks here.

Use Stable unless the spec explicitly selects `profiles/weixin-ai-alpha/`.
For implementation completion, run `npm run validate:fast`, then
`npm run build:h5`, then `npm run build:mp-weixin`.
