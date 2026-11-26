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

如果 Spec 选择了微信 AI Alpha，遇到 Profile 缺失、配置不合法或运行时无法验证时，应明确报告对应问题，保留该 Profile 的验收要求。

## 在生成项目里调用 Skill

打开生成项目根目录。要写需求或交接，可以直接说「把首页加载失败后的重试写成验收场景，列出哪些行为已有测试」。在 Codex 中可用 `$author-agent-docs`，在 Claude Code 中可用 `/author-agent-docs`。其他客户端可从 `AGENTS.md` 和索引进入同一份正文。

生成器会在 `.agents/skills/` 和 `.claude/skills/` 写入普通 Markdown 入口，保留 Skill 的名称和触发描述，正文链接回 `.agent/skills/<id>/SKILL.md`。修改项目工作流后，在生成项目根目录运行：

```bash
node scripts/sync-agent-skills.mjs
node scripts/sync-agent-skills.mjs --check
```

`uni-app` 提供 uni-helper 整理的框架文档参考；`web-design-guidelines` 用于明确要求的 H5 界面审查。两份社区 Skill 的正文在 `.agents/skills/`。

## 在写作中使用 MCP

写组件清单时，用默认的 DCloud MCP 查询含 `pages.json` 的源码目录。写 API 兼容性说明时，可调用已配置的 uni-helper 文档检索，再核对结果中的文档原文。首次启动文档服务会下载模型，只做本地组件查询时可在客户端关闭该服务。客户端配置位置、真实工具名称、参数与失败排查见[项目 MCP 手册](agent-mcp.md)。

`--no-ai-assets` 生成的项目省略这些 Skill、MCP 配置和维护脚本。

## 任务路由

| 任务                                        | Skill                  |
| ------------------------------------------- | ---------------------- |
| 编写 Spec、实施任务书、验收交接或项目 Skill | `author-agent-docs`    |
| 从 skeleton 创建项目                        | `project-init`         |
| 新 Feature、页面或业务流程                  | `add-feature`          |
| 新平台能力或权限                            | `add-platform-adapter` |
| API、DTO、请求与错误                        | `add-api-client`       |
| H5 与微信端表现不同                         | `cross-platform-debug` |
| 启用或修改微信 AI Alpha                     | `weixin-ai-profile`    |
| 新增测试或验收层                            | `testing-scaffold`     |
| 架构、依赖或包体审查                        | `architecture-review`  |

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
