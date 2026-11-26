# {{PROJECT_TITLE}}

Generated from the Koi uni-app blueprint.

For a first setup, follow the [local development guide](LOCAL_DEVELOPMENT.md).
It covers Node/npm, both development targets, WeChat DevTools discovery and MCP checks.

## Start

```bash
npm ci
npm run validate
```

Development:

```bash
npm run dev:h5
npm run dev:mp-weixin
```

- H5 runs at `http://127.0.0.1:5173`.
- Import `dist/dev/mp-weixin` into WeChat DevTools after starting the WeChat
  target.
- Configure the WeChat AppID in `src/manifest.json` through your
  project-specific process. Never commit upload private keys.
- Copy `.env.example` to `.env` to override public API base URLs or the
  request timeout. Every `VITE_*` value is bundled into the client and cannot
  be a credential.

When generated with agent assets, open `docs/ai-quickstart.md` to write a spec
or handoff with `author-agent-docs`. The per-client MCP setup and a component
lookup example are in `docs/agent-mcp.md`.

## Commands

After `npm run build:h5`, run `npx playwright install chromium` once and use
`npm run test:smoke:h5` to verify the homepage's retry behavior.
When agent assets are present, `npm run check:agent` checks Skill links and
MCP configuration without starting any MCP servers.

| Command                                     | Purpose                                                   |
| ------------------------------------------- | --------------------------------------------------------- |
| `npm run dev:h5`                            | Start the H5 Vite server                                  |
| `npm run dev:mp-weixin`                     | Watch and compile the WeChat target                       |
| `npm run build:h5`                          | Build `dist/build/h5`                                     |
| `npm run build:mp-weixin`                   | Build `dist/build/mp-weixin`                              |
| `npm run build:targets`                     | Build H5 and `mp-weixin`                                  |
| `npm run validate:fast`                     | Type, lint, architecture, profile, route, and unit checks |
| `npm run validate`                          | Full local/CI gate with coverage and both target builds   |
| `npm run scaffold:feature -- orders detail` | Create a thin Feature and route                           |

`check:mp-budget` reports the main package, every configured subpackage, and
the total output separately. Override the internal safety margins with
`KOI_MP_MAIN_PACKAGE_LIMIT_BYTES`, `KOI_MP_SUBPACKAGE_LIMIT_BYTES`, and
`KOI_MP_TOTAL_LIMIT_BYTES`;
`KOI_MP_PACKAGE_LIMIT_BYTES` remains a legacy alias for the main package only.

The generated application uses the stable DCloud compiler cohort. Weixin's
runtime AI development mode is a separate, explicit Alpha capability; read
`profiles/weixin-ai-alpha/README.md` before enabling it.

## License

[MIT](LICENSE) © The {{PROJECT_TITLE}} authors. Review the copyright line in
`LICENSE` before publishing.
