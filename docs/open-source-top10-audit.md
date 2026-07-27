# uni-app 开源架构 Top 10 审计

审计日期：2026-07-27。

本审计面向 Vue 3、TypeScript、Vite CLI 与微信小程序/H5 共用代码的
uni-app 应用架构。排名衡量的是“对通用应用蓝图的参考价值”，不是 Star 榜、
UI 框架榜或生产可直接照搬榜。所有源码证据固定到完整 commit SHA；Star、Fork
和 pushed 日期是审计日快照。

机器可读的分数、元数据、固定源码链接、决策映射和淘汰项位于
[`research/uniapp-top10-2026-07-27.json`](research/uniapp-top10-2026-07-27.json)，
由 `npm run check:audit` 校验。

## 方法

候选池来自 GitHub `uni-app`/Vue 3/TypeScript/Vite starter、generator 和官方
参考工程。先检查 license、默认分支、最近源码、`package.json`、Vite/TypeScript
配置、pages/manifest、目录边界、测试和 CI，再按六项各 0–5 分：

| 缩写 | 维度                         | 核心问题                                     |
| ---- | ---------------------------- | -------------------------------------------- |
| B    | 应用骨架完整度               | 是否有可运行页面、API、状态、配置和演进空间  |
| A    | 架构边界与可维护性           | 职责与依赖是否清楚，是否可脱离 UI 复用       |
| X    | 跨端构建证据                 | 是否真实覆盖 H5 与小程序，而非只列脚本       |
| Q    | 测试与 CI                    | 测试是否存在、是否在 CI 真正执行且失败会阻断 |
| M    | 维护活跃度                   | 当前分支、依赖和最近有效源码是否持续维护     |
| R    | 文档、复用与 AI 协作参考价值 | 是否容易生成、理解、修改和稳定验证           |

Star 只作为采用度背景，不直接进入总分。相同总分时，真实应用骨架优先于生成器，
维护中的当前仓优先于历史仓。官方最小模板因不承担完整架构职责而得分不高，但仍是
依赖兼容性的最高权威来源。

## Top 10

|   # | 项目                                                                                                                        | 审计快照                                 | B/A/X/Q/M/R          | 结论                                                                        |
| --: | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
|   1 | [`feige996/unibest`](https://github.com/feige996/unibest/tree/c5e2d304089979543ff31276c3884eec3804e05a)                     | 2163★ / 261 forks；2026-07-06；MIT       | 5/5/5/3/5/5 = **28** | 最完整的现代应用参考；吸收 typed env 与 HTTP 失败语义，不复制重 UI/插件默认 |
|   2 | [`uni-helper/create-uni`](https://github.com/uni-helper/create-uni/tree/db85c2b59f8ada6e0b0ee91ae34e5d679fb60a46)           | 301★ / 20 forks；2026-07-27；MIT 文件    | 4/5/5/5/5/4 = **28** | 最强生成器合同；吸收生成后和跨系统验证，不照搬自由组合复杂度                |
|   3 | [`wot-ui/wot-starter`](https://github.com/wot-ui/wot-starter/tree/7b9407b1d54b675ab412d4e2acd3cc93b6f64c49)                 | 361★ / 62 forks；2026-07-13；MIT         | 5/5/5/3/5/4 = **27** | API、mock、分包和 Agent Skills 有价值；CI 无单测且存在吞失败 smoke          |
|   4 | [`oyjt/uniapp-vue3-template`](https://github.com/oyjt/uniapp-vue3-template/tree/4d7f3075a739c37c7fd7cff73a5d2ee7d034e113)   | 622★ / 139 forks；2026-06-04；MIT        | 5/5/5/2/5/4 = **26** | 环境、请求与 AI 规则完整；CI 只证明 H5，重复 Agent 资产偏重                 |
|   5 | [`uni-helper/vitesse-uni-app`](https://github.com/uni-helper/vitesse-uni-app/tree/ce641a3a6d701c2b0db7006c0be7f430c96ec3d2) | 568★ / 60 forks；2026-03-04；MIT         | 4/4/5/4/4/5 = **26** | 多系统构建和页面 smoke 优秀；CI 没调用已有测试，默认约定魔法较多            |
|   6 | [`sunpm/unisave`](https://github.com/sunpm/unisave/tree/2fcbb13831c5bb0f1f8992eb79600ee2a80629da)                           | 134★ / 6 forks；2026-03-11；MIT          | 4/4/5/3/4/3 = **23** | services、分包与 Vitest 可参考；缺 CI，默认 UI/插件较重                     |
|   7 | [`Ares-Chang/uni-vitesse`](https://github.com/Ares-Chang/uni-vitesse/tree/76b1e76d333f606d96a95d91fb8bdf4cf4af63f7)         | 341★ / 57 forks；2026-04-01；MIT         | 4/4/5/2/4/4 = **23** | 插件型 starter 清楚；没有测试/CI，隐式路由和自动导入不进 Stable             |
|   8 | [`dcloudio/uni-preset-vue`](https://github.com/dcloudio/uni-preset-vue/tree/f480e2a61f63c9498518cd8b202dc2dde1e34059)       | 372★ / 134 forks；2026-07-26；Apache-2.0 | 3/2/5/2/5/5 = **22** | 官方 `vite-ts` 依赖真值源；不是完整应用架构                                 |
|   9 | [`vue-rookie/uni-vue3`](https://github.com/vue-rookie/uni-vue3/tree/d54e00964dda2af827f1a8a42c8b4b45ee3c395b)               | 195★ / 29 forks；2025-12-12；MIT         | 4/4/5/2/3/4 = **22** | API、分包和 AI chat 示例完整；无测试/CI，基线活跃度较弱                     |
|  10 | [`hu-snail/snail-uni`](https://github.com/hu-snail/snail-uni/tree/f38d06b5519f34f53c483783747af6b17c8f8537)                 | 109★ / 8 forks；2025-10-20；MIT          | 4/4/4/2/3/3 = **20** | 可选项生成器有参考；raw template 不能代替生成后验证                         |

### 1. unibest

[`package.json`](https://github.com/feige996/unibest/blob/c5e2d304089979543ff31276c3884eec3804e05a/package.json)
证明它具备多端、多环境、类型、Lint、测试、OpenAPI 和上传命令；
[`src/http/http.ts`](https://github.com/feige996/unibest/blob/c5e2d304089979543ff31276c3884eec3804e05a/src/http/http.ts)
集中处理 transport 与错误分类。它是本轮最完整的应用骨架，但审计分支没有把这些
检查组成可信 CI，默认认证、UI、UnoCSS 与插件也不适合作为通用最小核心。

### 2. create-uni

[`packages/core/src/index.ts`](https://github.com/uni-helper/create-uni/blob/db85c2b59f8ada6e0b0ee91ae34e5d679fb60a46/packages/core/src/index.ts)
把模板、配置、模块、插件和 UI 设计为组合能力；
[`core_test.yml`](https://github.com/uni-helper/create-uni/blob/db85c2b59f8ada6e0b0ee91ae34e5d679fb60a46/.github/workflows/core_test.yml)
实际覆盖 Windows/macOS、Node 版本、包管理器和生成后的 H5/mp-weixin 构建。
Koi 采用它的“输出物才是合同”原则，但保持一个明确 Stable，而不是组合平台。

### 3. Wot Starter

[`src/api/core/instance.ts`](https://github.com/wot-ui/wot-starter/blob/7b9407b1d54b675ab412d4e2acd3cc93b6f64c49/src/api/core/instance.ts)
和真实分包适合观察产品级边界；[`ci.yml`](https://github.com/wot-ui/wot-starter/blob/7b9407b1d54b675ab412d4e2acd3cc93b6f64c49/.github/workflows/ci.yml)
构建多端产物，但没有运行 lint/typecheck/unit，部分 dev smoke 还通过 `|| true`
吞掉失败。Koi 保留其分包计量和 Skill 来源思路，不接受伪绿门禁。

### 4. oyjt Template

[`build/plugins/index.ts`](https://github.com/oyjt/uniapp-vue3-template/blob/4d7f3075a739c37c7fd7cff73a5d2ee7d034e113/build/plugins/index.ts)
展示了清楚的 Vite 插件接线与多环境组织；[`deploy.yml`](https://github.com/oyjt/uniapp-vue3-template/blob/4d7f3075a739c37c7fd7cff73a5d2ee7d034e113/.github/workflows/deploy.yml)
只验证 H5。Koi 吸收 typed env，不复制大量 IDE 私有规则、UI 套件和 H5-only
完成定义。

### 5. Vitesse uni-app

[`test/index.test.ts`](https://github.com/uni-helper/vitesse-uni-app/blob/ce641a3a6d701c2b0db7006c0be7f430c96ec3d2/test/index.test.ts)
证明页面级 uni-app smoke 可行；[`check.yml`](https://github.com/uni-helper/vitesse-uni-app/blob/ce641a3a6d701c2b0db7006c0be7f430c96ec3d2/.github/workflows/check.yml)
具有很强的跨系统构建矩阵，却未执行仓库已有的 test script。Koi 先确保所有已有
测试都进入唯一 `validate`，页面运行 smoke 留待出现真实交互验收压力时再增加。

### 6–10. 结构样本与边界样本

- Unisave 的 [`package.json`](https://github.com/sunpm/unisave/blob/2fcbb13831c5bb0f1f8992eb79600ee2a80629da/package.json)
  与 [`request service`](https://github.com/sunpm/unisave/blob/2fcbb13831c5bb0f1f8992eb79600ee2a80629da/src/services/request/index.ts)
  提供 service/测试/分包样本，但没有 CI。
- uni-vitesse 的 [`vite.config.ts`](https://github.com/Ares-Chang/uni-vitesse/blob/76b1e76d333f606d96a95d91fb8bdf4cf4af63f7/vite.config.ts)
  是文件路由、layouts、auto-import 和 UnoCSS 的典型组合，也说明为何 Koi Stable
  要保持显式配置。
- 官方 [`vite-ts/package.json`](https://github.com/dcloudio/uni-preset-vue/blob/f480e2a61f63c9498518cd8b202dc2dde1e34059/package.json)
  是本次 DCloud `3.0.0-5010520260709002`、Vue `3.4.21`、Vite `5.2.8`
  cohort 的真值来源。
- uni-vue3 的 [`platform.ts`](https://github.com/vue-rookie/uni-vue3/blob/d54e00964dda2af827f1a8a42c8b4b45ee3c395b/src/utils/platform.ts)
  表明平台判断需要集中，但 Koi 进一步把 host 调用限制到 `src/platform/`。
- snail-uni 的 [`template/package.json`](https://github.com/hu-snail/snail-uni/blob/f38d06b5519f34f53c483783747af6b17c8f8537/create-snail-uni/template/package.json)
  保留占位符，提醒审计生成器时必须验证真实输出，而非只验证模板源。

## 落到 Koi 的方案

### 已采用或加固

| 决策                                  | 外部证据                                                                                         | Koi 落点                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 生成后的文件才是脚手架合同            | create-uni + Vitesse                                                                             | 生成器 smoke 覆盖 dry-run、冲突、force、AI 资产边界；CI 增加轻量跨系统合同 |
| 公开环境配置应显式且 typed            | unibest + oyjt + [Vite env](https://vite.dev/guide/env-and-mode)                                 | `.env.example`、`ImportMetaEnv`、纯解析器、`check:env`                     |
| HTTP 成功与失败语义必须测试           | unibest + Wot                                                                                    | 可注入 `UniRequestExecutor`；覆盖 2xx、非 2xx、timeout、network            |
| 分包后不能仍把总产物误判为主包        | Wot + Unisave + [官方 pages 语义](https://uniapp.dcloud.net.cn/collocation/pages?id=globalstyle) | 分别报告和限制主包、各分包、总产物                                         |
| 架构和路由规则必须对恶意/误写路径闭合 | 本地负向夹具 + 官方 pages 语义                                                                   | Feature 不能导入实现；拒绝路径逃逸、重复 root、分包 TabBar 和未知 preload  |
| 版本兼容性以官方模板为真值            | DCloud `vite-ts`                                                                                 | DCloud cohort 继续 exact pin，并由脚本拒绝拆组升级                         |
| 编译器与 peer 依赖必须一起评审        | Wot + [Renovate 分组规则](https://docs.renovatebot.com/configuration-options/#packagerules)      | 根和生成项目共享 dependency group；cohort 检查继续阻断不兼容结果           |
| CI 中存在但未执行的检查等于不存在     | Top 10 多个反例                                                                                  | `npm run validate` 仍是唯一完成门，测试、双构建和预算失败都会阻断          |

### 明确保留为可选 profile

- 文件路由、auto-import、layouts、UniKuRoot；
- UnoCSS、Tailwind、Wot、uView 和其他 UI 套件；
- OpenAPI 生成、上传/预览工具、token refresh、全局 store 持久化；
- `vitest-environment-uniapp` 页面 smoke、Playwright 或 DevTools E2E；
- 新增平台、uniCloud、App 原生插件和产品级 mock 数据。

这些能力并非不好，而是没有真实 Feature 压力时会扩大依赖图、隐式行为和 Agent
搜索空间。Stable 先提供清楚的扩展点；需求出现后通过 Spec/Profile 加入，并进入
同一个完成门。

## 未进入 Top 10

- `codercup/unibest` 是历史高星仓，当前维护迁移到 `feige996/unibest`，不能重复计分。
- `ATQQ/uni-vue3-ts-template` 已归档。
- `yang1206/uniapp-template` 默认分支仍是旧 Alpha cohort 且无测试/CI。
- `MatrixCross/Vue3-Uniapp-Starter` 混合了缺少验证的跨代依赖。
- `wot-design-uni/uview-plus/z-paging/unocss-applet` 是本快照的库类分组标签，
  它们是组件或工具而非应用 skeleton。
- `dcloudio/hello-uniapp` 是官方 API/组件行为参考，不是通用架构。
- `dcloudio/uni-starter` 可作为官方真实分包参考，但其 HBuilderX、uniCloud、`uni_modules`
  组合不进入现代 CLI 排名。

## 审计边界

本轮完成了仓库元数据与固定 commit 的源码、配置、脚本和 CI 静态审查；没有声称
把十个外部项目全部安装并跑完各自所有目标。Koi 自身的采用项必须通过本仓库
`npm run validate`，外部 README 声明不能替代可执行证据。
