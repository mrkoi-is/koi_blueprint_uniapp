# Generated project upgrades

Owners of a Stable generated app can identify its original blueprint, preview
an upgrade, and integrate the update into a separate Git branch while keeping
the application's customizations. Both H5 and mp-weixin remain supported.

- Default and no-AI generation record the effective options and full source
  commit. An edited or unidentified source records a null commit.
- Given an old app with a custom invoice route, preview from two fixed commits
  shows upstream additions without writing to the app. The owner can finish
  the upgrade and keep the route, its test and the application's README notes.
- Given a conflicting file, the owner can resolve the conflict and continue, or
  abort and recover the original branch and baseline. Invalid or missing
  source evidence has an actionable diagnostic.
- Verify with the generator contract and historical upgrade fixture on
  Windows and Linux, and both builds and package budgets on the upgraded app.
