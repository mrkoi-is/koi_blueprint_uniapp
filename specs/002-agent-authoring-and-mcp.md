# Agent authoring and MCP in generated projects

## Outcome and scope

A developer opening a generated Stable project can ask an agent to draft a spec,
write an evidence-based handoff, maintain a project Skill, or look up a local
uni-app component. The project carries the instructions and client configuration
needed for those tasks. The blueprint records the repository and community audit.

## Acceptance

- A normal generation exposes each indexed project Skill to Codex and Claude
  Code. Both native entries lead to the same maintained workflow and resolve
  its relative resources. An author can refresh or check discovery after an edit.
- A writing request selects a workflow with an example that distinguishes
  observed results from pending acceptance. A developer can register a new Skill.
- The supported MCP clients receive valid workspace configurations for the same
  two tested servers at fixed versions. The guide names each tool, the
  component query source path, how to check both outputs and how to use only
  component lookup when a project does not need the documentation model.
- A dry run lists the agent files without writing. A fresh `--no-ai-assets`
  project omits them. Editor files outside the distribution list stay in the
  source checkout. Reviewed community evidence stays with the blueprint.
- Run the offline generator contract and install and validate a freshly
  generated app, including coverage, H5, mp-weixin and its package budget.
  Record actual MCP calls separately from configuration validation in CI.

The two build targets use the Stable runtime. This change affects development
files and has no page, state or runtime API changes.
