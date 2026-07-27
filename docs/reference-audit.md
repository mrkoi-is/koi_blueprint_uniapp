# Reference audit

This blueprint was derived from the Koi blueprint family and a source-level
uni-app ecosystem audit completed on 2026-07-27. The full current Top 10,
scores, commit-pinned evidence, limitations, adoption mapping, and exclusions
are in [`open-source-top10-audit.md`](open-source-top10-audit.md); its canonical
snapshot is machine checked.

## Patterns retained

| Reference                        | Pattern retained                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `koi_blueprint_python`           | Meta-repository plus runnable `skeleton/`, explicit configuration, typed boundaries, one validation entry point                |
| `koi_blueprint_flutter`          | Feature-first ownership, platform adapters, generated-project validation, AI instructions close to the code                    |
| `koi_blueprint_vue`              | Vue 3 and Vite conventions, centralized HTTP/configuration, store discipline, browser-facing developer workflow                |
| local `mrkoi-ui` uni-app package | H5 + `mp-weixin` parity, token-based UI layering, props-down/events-up components, compiled package-budget checks              |
| current open-source Top 10       | typed public env, tested HTTP failures, generated-output contracts, cross-system generator smoke, safe route/subpackage checks |

The family-wide AI convention is preserved: `AGENTS.md` routes an agent to
`.agent/skills/index.yaml`; each task loads only its matching `SKILL.md`; specs
hold acceptance criteria and ADRs hold lasting architecture decisions.

## Patterns deliberately not copied

- Native Weixin four-file pages and components (`.js/.json/.wxml/.wxss`).
- Product-specific pet, sticker, points, billing, brand-font, and showcase code.
- A UI-library playground inside the application bundle.
- Nested `.git` directories, copied caches, build output, or local credentials.
- A deep `domain/application/data` tree for every small Feature.
- Direct `wx.*`, DOM, or storage calls in pages and business logic.
- Independently upgraded DCloud compiler packages.

## Resulting decisions

- CLI-first uni-app with Vue 3, TypeScript, Vite, and Pinia.
- Stable DCloud cohort by default; H5 and `mp-weixin` are both required builds.
- Thin pages compose Feature code; `model.ts` and `use-*.ts` stay testable
  without a uni-app runtime.
- `uni.*` lives in `src/platform/`; `wx.*` is reserved for
  `src/platform/mp-weixin/` when no portable API exists.
- The Weixin runtime AI development mode is an explicit Alpha profile under
  `profiles/weixin-ai-alpha/`, separate from editor-side AI collaboration.
- Toolchain, route, architecture, runtime-AI profile, coverage, build, and
  package-size checks are executable rather than prose-only rules.
- Main-package and subpackage sizes are measured separately from compiled
  output.
- Blueprint-only research/spec context is not copied into consumer projects.

## Upstream sources

- [Koi Python blueprint](https://github.com/mrkoi-is/koi_blueprint_python)
- [Koi Flutter blueprint](https://github.com/mrkoi-is/koi_blueprint_flutter)
- [Koi Vue blueprint](https://github.com/mrkoi-is/koi_blueprint_vue)
- [DCloud Vue 3 TypeScript template](https://github.com/dcloudio/uni-preset-vue/tree/vite-ts)
- [Open-source Top 10 audit](open-source-top10-audit.md)
- [uni-app CLI guide](https://uniapp.dcloud.net.cn/quickstart-cli.html)
- [uni-app platform conditionals](https://uniapp.dcloud.net.cn/tutorial/platform.html)
- [uni-app Pinia guide](https://uniapp.dcloud.net.cn/tutorial/vue3-pinia.html)
- [uni-app Weixin AI development mode](https://uniapp.dcloud.net.cn/tutorial/mp-weixin-ai-develop.html)
