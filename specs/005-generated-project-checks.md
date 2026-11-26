# Generated app CI

A generated Stable app checks its own agent assets and renders its H5 retry
flow in a browser. Both H5 and Weixin builds remain part of the app gate.

- Given an AI-enabled app, a stale Skill link or missing required MCP entry
  fails validation. Extra workspace MCP entries are allowed.
- Given a no-AI app, validation runs using only the generated application.
- Given the H5 production build, intercept the first welcome request with
  a 503 and the second with a valid response. Clicking Try again displays
  the response heading and body. Run this with Chromium in CI.
