# Stable reference applications

From the blueprint root, create a reference app in an empty destination. Each
example starts from the same Stable skeleton and includes its own lockfile.

```bash
npm run example -- openapi ../koi-openapi
npm run example -- typed-routes ../koi-typed-routes
npm run example -- wot-form ../koi-wot-form
```

In any generated app run `npm ci`, `npm run validate`, and then
`npm exec -- playwright install chromium` and `npm run test:smoke:h5`.
From the blueprint root, `npm run check:example -- <sample> --h5`
runs the equivalent checks in a disposable directory.

- **OpenAPI.** Edit `contracts/welcome.openapi.json`, then run
  `npm run generate:api`. The local schema generates a DTO for the existing
  welcome repository. The repository validates the response at runtime.
  Use a versioned schema and keep the generated files alongside the contract.
- **Typed routes.** After changing `src/pages.json` run
  `npm run generate:routes`. Fast validation checks for stale types. The home
  buttons exercise a subpackage route and a settings tab. When adopting the
  sample in an existing app, copy the generator and adapter, then generate from
  that app's route file to include its own pages.
- **Wot form.** Open the invoice form, try saving empty, enter a customer name,
  and save again. The sample manages a local draft. For the simulator, build
  the configured project and use
  `npm run test:smoke:mp-weixin -- ../koi-wot-form --scenario wot-form`.
  The two Wot source components have narrow TypeScript declarations for the
  props used here. Review these declarations when upgrading Wot. The
  sample's application code keeps the Stable compiler settings. See [Wot
  component docs](https://wot-ui.cn/component/input.html).

## Refreshing example locks

When updating Stable dependencies or an example version, generate a no-AI
Stable app in a temporary directory for each changed dependency overlay. In
that directory run `npm install --package-lock-only --save-exact <dependency>`,
using `--save-dev` for OpenAPI. Compare its lock with the fresh Stable lock.
Update the overlay's package version, added/changed entries under `packages`,
removed paths, and `baseSha256` of the current skeleton lock. Run
`check:example` to verify the composed lock with a fresh `npm ci`.

## Wot Mini Program size

Measured on macOS with Node 22.18.0 and DCloud compiler 5.34. Both builds
used the same invoice page, route, model and production options. The comparison
used native input and button components in the first build and Wot UI 2.3.1
in the second.

| Build             |      Main | Invoice subpackage |     Total |
| ----------------- | --------: | -----------------: | --------: |
| Native components | 127,136 B |            1,070 B | 128,206 B |
| Wot UI components | 210,271 B |            1,526 B | 211,797 B |
| Increase          |  83,135 B |              456 B |  83,591 B |

The compiler emitted Wot's shared component files into the main package.
Its largest files there were button styles (38,304 B), icon styles
(14,161 B), loading styles (6,895 B) and input code (3,880 B).
