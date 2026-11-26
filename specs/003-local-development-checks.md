# Local development and MCP connectivity checks

## Outcome

A developer can set up a fresh Stable project, diagnose prerequisites for H5
and WeChat Mini Program development, and verify which MCP services respond.

## Scope and acceptance

- The generated project includes a local setup guide and an offline doctor for
  Node, npm, project dependencies, WeChat DevTools CLI and compiled project
  location. H5 development works on a machine without the WeChat application.
- Missing required prerequisites have an actionable diagnostic and nonzero
  exit status. WeChat mode requires the CLI. Report installation, service
  reachability and login only to the extent actually checked.
- The default MCP check validates the shipped workspace configurations offline.
  An explicit live check verifies both configured stdio servers with a read-only
  tool call using the correct source directory.
- An optional DevTools MCP check uses the endpoint the developer selects in the
  IDE. It verifies tool discovery independently of the two template servers.
- Ordinary generation, dry run and omission of AI assets preserve their current
  contracts. Developer machine settings and online probes are outside CI gates.
  The runtime profile remains Stable on both targets.

## Verification

Check normal and no-AI generation, exercise missing and working prerequisites
and MCP responses, and run the local fast gate, H5 build, Mini Program build,
package budget and fresh generated-project validation. Record the local client
and services that were actually reachable.
