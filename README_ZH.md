# koi_blueprint_uniapp

[![Validate blueprint](https://github.com/mrkoi-is/koi_blueprint_uniapp/actions/workflows/ci.yml/badge.svg)](https://github.com/mrkoi-is/koi_blueprint_uniapp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.13%20%3C25-brightgreen.svg)](.nvmrc)

面向 AI Agent 与 vibe coding 的 uni-app 通用架构蓝图，技术基线为 Vue 3、
TypeScript、Vite、Pinia，默认同时交付 H5 与微信小程序。

## Stable 默认基线

Stable profile 提供：

- 一份 Feature 代码同时编译到 H5 与 `mp-weixin`；
- Vue 单文件页面与严格 TypeScript；
- 最小 Feature 分层，不强制为简单功能套完整 DDD；
- 集中的 HTTP、typed env 配置和依赖接线；
- 隔离 `uni.*`、`wx.*` 与浏览器全局对象；
- 可测试的 HTTP 成功、状态码、超时和网络失败语义；
- 确定性脚手架、路径安全路由检查和主包/分包/总量独立预算；
- `Spec → Skill → 最薄纵向切片 → 验证` 的 vibe coding 闭环。

`profiles/weixin-ai-alpha/` 是随生成项目交付、但需显式启用的实验 profile，只承载
微信 AI 预览能力的启用说明与模板，不被 Stable 运行时代码导入，也不会默认开启。项目选择
Alpha 后，业务 Feature 仍只能依赖窄接口，H5 必须保留 unsupported/fallback 路径，
并继续通过 Stable 的双构建门禁。

## 立即运行

从蓝图根目录验收“真实生成结果”：

```bash
npm run validate
```

该命令会创建临时项目、安装锁定依赖、生成一个 Feature，再执行格式、类型、Lint、
单测与覆盖率、H5/mp-weixin 双构建及包预算。只需快速检查蓝图和生成器合同时运行：

```bash
npm run validate:blueprint
```

直接开发内置 skeleton：

```bash
cd skeleton
npm ci
npm run validate
```

开发时选择一个目标：

```bash
npm run dev:h5
npm run dev:mp-weixin
```

启动微信目标后，在微信开发者工具中导入 `dist/dev/mp-weixin`。正式构建分别输出到
`dist/build/h5` 与 `dist/build/mp-weixin`。

## 生成项目

```bash
node scripts/apply-skeleton.mjs ../my-uni-app \
  --name my-uni-app \
  --title "我的应用"

cd ../my-uni-app
npm ci
npm run validate
```

生成器支持 `--dry-run`、`--force` 和 `--no-ai-assets`。最后一个选项会省略
编辑器 Agent 桥接、Skills、消费端文档与 Spec 模板；未启用的运行时 profile
参考仍属于应用 skeleton。默认生成只分发消费项目所需的 AI 上下文，不会把本蓝图的
Top 10 审计或建设规格复制进去。

## 公开环境配置

复制 `.env.example` 到本地 `.env` 后，可覆盖 local/staging/production API
地址和请求超时：

```text
VITE_API_BASE_URL_LOCAL=http://127.0.0.1:8787
VITE_API_BASE_URL_STAGING=https://staging-api.example.com
VITE_API_BASE_URL_PRODUCTION=https://api.example.com
VITE_REQUEST_TIMEOUT_MS=10000
```

这些 `VITE_*` 值会进入客户端产物，不能存放密钥。微信 develop/trial/release
到 local/staging/production 的选择仍由 typed runtime resolver 完成。

## 最小 Feature

```text
src/
  features/orders/
    model.ts
    use-orders.ts
    public.ts
  pages/orders/index.vue
tests/unit/orders.test.ts
```

只有确有需要时才增加 `orders.api.ts`、组件或 Feature 自有 Pinia Store。页面负责
渲染状态和转发用户意图；流程与业务判断保持纯 TypeScript，可脱离 Vue 和平台运行时
测试。

```bash
npm run scaffold:feature -- orders index
npm run validate:fast
```

## 验收合同

本地与 CI 都以 `npm run validate` 为准：

```text
格式 → 类型 → Lint → DCloud 编译器版本组检查
→ 环境/架构/路由 → 单测与覆盖率
→ H5 构建 → mp-weixin 构建 → 小程序主包/分包/总量体积预算
```

## 2026 开源 Top 10 审计

已按应用骨架、架构、跨端、质量、维护和复用六个维度审核 10 个当前开源方案，
并把每条采用决策映射到固定 commit 源码与本仓库文件。结论不是“堆最多插件”：
Koi 继续保留官方 exact DCloud cohort、显式 pages/manifest/imports、Feature
边界和双端完成门；typed env、HTTP contract 测试、生成器合同、路由安全和分包
计量则已补强。

完整排名、证据、局限和淘汰项见
[`docs/open-source-top10-audit.md`](docs/open-source-top10-audit.md)，机器快照由
`npm run check:audit` 校验。

详细说明见：

- `docs/open-source-top10-audit.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/vibe-coding-workflow.md`
- `docs/PROJECT_PLAN.md`

## 参与贡献

变更流程、环境要求与生成器合同见 [`CONTRIBUTING.md`](CONTRIBUTING.md)；
参与本仓库需遵守[行为准则](CODE_OF_CONDUCT.md)。安全漏洞请按
[`SECURITY.md`](SECURITY.md) 私下报告，不要开公开 Issue。

## 许可证

[MIT](LICENSE) © mrkoi。生成项目会附带一份自己的 `LICENSE`，版权行按项目
标题实例化——发布你的应用前请核对。
