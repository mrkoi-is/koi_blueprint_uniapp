# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

The blueprint is a project generator rather than a deployed service. Fixes
land on `main`; regenerate or re-sync your project to pick them up.

## Reporting a Vulnerability

**Do not open a public issue for security reports.**

Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/mrkoi-is/koi_blueprint_uniapp/security/advisories/new).
You can expect an acknowledgement within 7 days and a resolution or a
documented decision within 30 days.

In scope for reports:

- the generator writing outside the requested target directory or overwriting
  files it must not touch;
- template output that injects secrets, credentials, or unsafe defaults into
  generated projects;
- CI or scripts executing attacker-controlled input from a pull request.

Out of scope:

- vulnerabilities in dependencies (report upstream; pinned DCloud cohort
  updates are handled via Renovate);
- projects generated from this blueprint after their owners modified them.

Never commit credentials, private keys, `.env` files, or
`project.private.config.json` — see `CONTRIBUTING.md` for the full
do-not-commit list.
