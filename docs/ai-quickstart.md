# AI Quickstart

目标：让 AI 用最少上下文完成可验证的 uni-app 小程序改动。

## 唯一事实源

- `.agent/skills/index.yaml` 只负责把任务路由到 Skill。
- `.agent/skills/<skill-id>/SKILL.md` 是对应工作流的唯一事实源。
- `AGENTS.md` 只提供仓库级边界和执行合同。
- Claude、Copilot、Cursor 文件只是桥接入口，不维护第二套规则。

聊天记录不是长期事实。需求放进 `specs/`，架构决策放进
`docs/adr/`，可执行事实由源码、测试和质量脚本承载。

## 最小读取顺序

1. 查看 `.agent/skills/index.yaml`。
2. 读取当前 `specs/*.md`；行为改动没有 Spec 时，先从
   `specs/000-template.md` 创建。
3. 只读取命中的一个或少数几个 `SKILL.md`。
4. 只搜索验收场景需要的源码、配置与测试。

只有改变长期边界时才读 `docs/architecture/ARCHITECTURE.md`。只有 Spec
明确选择 AI Alpha 时才读 `profiles/weixin-ai-alpha/`。不要一次加载全部
Skills、Profile、文档或示例。

## 技术基线

- uni-app + Vue 3 + 严格 TypeScript。
- `mp-weixin` 是主目标；H5 是开发与回归目标。
- Stable 是默认 Profile，依赖使用 skeleton 锁定的完整 DCloud cohort。
- Weixin AI Alpha 是显式可选 Profile，唯一目录为
  `profiles/weixin-ai-alpha/`。
- 请求经 `src/core/http/` 合同；具体 `uni.request` 实现在
  `src/platform/uni/`。
- 公开构建配置从 `.env.example` 起步，由 typed resolver 校验；`VITE_*`
  会进入客户端，不能填写密钥。
- 通用 `uni.*` 适配放在 `src/platform/uni/`，且任何 `uni.*` 都不能离开
  `src/platform/`；浏览器全局只在 `src/platform/h5/`，直接 `wx.*` 只在
  `src/platform/mp-weixin/`。
- Feature 的 model/use-case 不依赖 Vue、Pinia、uni-app 或平台全局。
- `dist/` 是生成产物，不手改。

## 外部 AI 工具链

生成项目自带两类外部 AI 能力（随 ai-assets 一并复制，`--no-ai-assets`
会一并跳过）：

- `.agents/skills/uni-app`：uni-helper 社区的 uni-app 知识 Skill，基于官方
  文档生成，覆盖组件、API、`pages.json` 与条件编译。
- `.agents/skills/web-design-guidelines`：Vercel 的通用 Web 设计规范，仅作
  设计参考；项目自身的 `DESIGN.md` 与设计系统优先级更高。
- `.kimi-code/mcp.json`：Kimi Code 项目级 MCP 配置，含两个 stdio 服务：
  - `uni-app-x-mcp`（DCloud 官方）：向 AI 提供当前项目的 easycom 组件
    清单，生成代码时优先使用已有组件。
  - `uni-doc`（`@uni-helper/mcp`）：uni-app 官方文档检索（RAG）。首次
    连接需下载向量库与模型文件，启动较慢，已配置 120 秒超时。

以上 MCP 经 `npx` 按需启动，无需全局安装；在生成项目根目录启动 AI 工具时
自动加载。

同一组 MCP server 按各工具的格式各放一份（内容保持一致，`.kimi-code/mcp.json`
是带超时等扩展字段的完整版）：

| 工具               | 配置文件                      |
| ------------------ | ----------------------------- |
| Kimi Code          | `.kimi-code/mcp.json`         |
| Claude Code / 兼容 | `.mcp.json`                   |
| Codex CLI          | `.codex/config.toml`          |
| Gemini CLI         | `.gemini/settings.json`       |
| Qoder IDE          | 设置界面粘贴 `.mcp.json` 内容 |

规则文件以 `AGENTS.md` 为公共事实源；`CLAUDE.md`、`GEMINI.md` 只做桥接。
Skills 放在跨工具通用目录 `.agents/skills/`，Codex、Gemini CLI、Cursor 等
均原生读取；Claude Code 经 `.claude/skills` 软链共用。

如果用户或 Spec 请求 Alpha，但 Profile 缺失、配置不合法或无法验证，应明确
失败；不能静默删除 Alpha 配置、模拟成 H5 功能或回退到 Stable。

## 任务路由

| 任务                       | Skill                  |
| -------------------------- | ---------------------- |
| 从 skeleton 创建项目       | `project-init`         |
| 新 Feature、页面或业务流程 | `add-feature`          |
| 新平台能力或权限           | `add-platform-adapter` |
| API、DTO、请求与错误       | `add-api-client`       |
| H5 与微信端表现不同        | `cross-platform-debug` |
| 启用或修改微信 AI Alpha    | `weixin-ai-profile`    |
| 新增测试或验收层           | `testing-scaffold`     |
| 架构、依赖或包体审查       | `architecture-review`  |

以 `.agent/skills/index.yaml` 的当前路由为准。

## Spec-first 实现闭环

1. 从 Spec 提取用户结果、范围、状态转换、失败恢复和验收场景。
2. 通过 Skill 索引选择最小工作流。
3. 实现最小端到端切片，页面只编排生命周期与用户意图。
4. 迭代时运行最窄相关测试。
5. 完成前依次运行：

   ```bash
   npm run validate:fast
   npm run build:h5
   npm run build:mp-weixin
   ```

6. 小程序产物变化时再运行：

   ```bash
   npm run check:mp-budget
   ```

`npm run validate` 是包含格式、环境合同、覆盖率、双构建和主包/分包/总量检查的
完整本地/CI 聚合命令，但不代替“先快速门禁、再双端构建”的开发反馈顺序。

以上命令从生成项目或 `skeleton/` 目录运行；在蓝图仓库根目录工作时，使用等价的
`npm --prefix skeleton run <script>`。

## 完成声明

最终汇报必须包含：

- 哪个验收行为发生了变化；
- 哪些自动命令实际通过；
- Stable 或 `weixin-ai-alpha` 中哪一个 Profile 被验证；
- 哪些权限、生命周期、AI Agent 行为或设备差异仍需微信开发者工具或真机。
