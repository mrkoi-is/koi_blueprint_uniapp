# Stable blueprint reliability and reference apps

Maintainers can diagnose missing compiler packages, retry incomplete feature
generation, reproduce the WeChat homepage recovery, verify Agent tooling, and
identify a formally tagged blueprint upgrade. This spec selects Stable for
H5 and mp-weixin.

| Initial condition                                                               | Action                                           | Observable result                                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Required DCloud dependency, peer, or lock entry is absent or wrong              | Run `check:dcloud-cohort`                        | Fast validation names the affected package                                                   |
| Route configuration is invalid, a destination exists, or scaffold calls overlap | Generate a feature                               | Existing content stays intact. Fixing the input allows one page, route, and test scaffold    |
| WeChat production homepage runs against controlled responses                    | Open the home route, observe 503, then tap retry | The error, success title and body are visible in sequence                                    |
| MCP receives an empty or marked easycom fixture                                 | Run the live check                               | Empty returns zero results. The marked component returns its name and content                |
| Same task and repository are available to an Agent                              | Evaluate the current and candidate writing Skill | Ratings cite actual files, reproducible steps, and accurately reported verification          |
| Maintainer selects an OpenAPI, typed routes, or Wot form example                | Generate it into an empty directory              | The selected example installs from its lockfile and passes both builds                       |
| Consumer has committed blueprint provenance                                     | Query Stable status                              | Official release tags determine the candidate and Git history determines upgrade eligibility |

Published source remains schema 1. Reference apps are explicit repo commands.
Run generated app validation, H5 and WeChat builds, package budgets, and the
historical upgrade fixture. Record IDE, browser, network replacement, and
device results using the environment in which each was observed.
