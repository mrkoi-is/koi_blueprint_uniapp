# 在生成项目中使用 MCP

在生成的项目根目录打开编辑器。模板预置两个无需 API 密钥的 stdio 服务。DCloud 的 `uni-app-x-mcp` 查询当前应用的 easycom 组件，社区的 `uni-doc` 检索 uni-app 文档。DCloud 的组件查询兼容本模板使用的 Vue 3 uni-app，H5 与微信小程序共用一套源码。组件的适用平台和最低版本仍需对照项目配置及官方文档。[DCloud 的适用范围和配置示例](https://doc.dcloud.net.cn/uni-app-x/tutorial/rules_mcp.html)

## 从项目根目录检查

运行 `npm run check:mcp` 离线核对六份配置，运行 `npm run check:mcp -- --live`
从项目配置发起组件和文档查询，逐项验证真实响应。单个编辑器的工作区信任或工具批准状态可在下方客户端表格所列入口查看。

微信开发者工具自身提供的 MCP 有独立的本机地址。需要检测模拟器客户端接入时，
先确认 CLI 安装，再用开发者工具给出的地址做工具发现。[微信客户端 MCP 接入与检查](weixin-devtools-mcp.md)

## 验证一个组件查询

1. 在客户端的 MCP 面板启用项目中的 `uni-app-x-mcp`。客户端通过 `npx` 启动 `@dcloudio/uni-app-x-mcp@0.0.5`，首次启动需要访问 npm。服务无需 API 密钥。
2. 请 Agent 列出该服务的工具，再用列出的组件查询工具查一次。服务公布的原名是 `Query all components under the project`，客户端可能将空格显示为下划线。
3. 唯一参数 `projectPath` 要填**含有 `pages.json` 的目录的绝对路径**。生成项目传 `<项目>/src`，在蓝图仓库内传 `<仓库>/skeleton/src`。传 npm 包根目录也可能返回空数组。
4. 新模板没有默认 easycom 组件，正常的响应文本是 `[]`。已有 `src/components/my-card/my-card.vue` 的项目应能查到 `my-card` 及其源码。要写手工导入的组件（例如 `HomeState.vue`）的文档，直接阅读导入它的页面和组件源码。

从项目根运行以下离线检查，可以核对六份客户端配置是否都带有模板预置的两个服务、对应启动命令和固定版本。

```bash
node scripts/check-mcp-config.mjs
```

需要单独排查某个工具时，可以使用与 `--live` 相同的官方 Inspector 1.0.6；它支持本模板的 Node 版本。下面的命令读取项目自己的配置。示例使用 POSIX shell，蓝图仓库中将末行的 `$PWD/src` 改成 `$PWD/skeleton/src`。[Inspector 命令行说明](https://github.com/modelcontextprotocol/inspector/tree/2997156791354497acb66091c79a2409d7f14429)

```bash
npx -y @modelcontextprotocol/inspector@1.0.6 --cli \
  --config .mcp.json --server uni-app-x-mcp --method tools/list
npx -y @modelcontextprotocol/inspector@1.0.6 --cli \
  --config .mcp.json --server uni-app-x-mcp --method tools/call \
  --tool-name 'Query all components under the project' --tool-arg "projectPath=$PWD/src"
```

## 客户端的项目入口

| 客户端                            | 项目文件                | 查看项目服务                                                                                                                                                                                                                                                 |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Claude Code                       | `.mcp.json`             | 运行 `claude mcp get uni-app-x-mcp` 查看作用域，在会话的 `/mcp` 中检查状态。[Claude Code](https://code.claude.com/docs/en/mcp)                                                                                                                               |
| VS Code 原生 Copilot、Copilot CLI | `.mcp.json`             | 在 Copilot 的 MCP 工具列表中检查服务。[VS Code](https://code.visualstudio.com/docs/agents/reference/mcp-configuration) · [Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)                             |
| VS Code 的编辑器托管模式（Local） | `.vscode/mcp.json`      | 运行 `MCP: List Servers`。这个文件使用顶层 `servers`。[编辑器配置](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)                                                                                                                    |
| Cursor                            | `.cursor/mcp.json`      | 在 Cursor 的 MCP 设置中查找该项目服务。[Cursor](https://cursor.com/docs/mcp)                                                                                                                                                                                 |
| Codex CLI                         | `.codex/config.toml`    | 从项目目录运行 `codex mcp get uni-app-x-mcp`，核对 stdio 命令和参数。[DCloud 的 Codex 配置](https://doc.dcloud.net.cn/uni-app-x/tutorial/rules_mcp.html)                                                                                                     |
| Gemini CLI                        | `.gemini/settings.json` | 在会话运行 `/mcp` 查看发现的工具。[Gemini CLI](https://geminicli.com/docs/tools/mcp-server/)                                                                                                                                                                 |
| Kimi Code                         | `.kimi-code/mcp.json`   | 在新会话运行 `/mcp`。旧版 Python CLI 可用 `kimi --mcp-config-file .kimi-code/mcp.json` 显式载入。[Kimi Code](https://moonshotai.github.io/kimi-code/en/customization/mcp.html) · [旧版 CLI](https://moonshotai.github.io/kimi-cli/en/customization/mcp.html) |

Qoder CLI 也支持根目录的 `.mcp.json`。使用 Qoder IDE 时，可在 MCP 或 Connectors 设置里导入同一份 JSON。[Qoder CLI](https://docs.qoder.com/cli/mcp-reference) · [Qoder 设置](https://docs.qoder.com/qoder/connectors)

在新生成的项目中，Claude Code 能识别项目 `.mcp.json` 中的两个服务并显示等待用户批准。Codex CLI 在项目受信任后可读到两者的版本和对应的 45 秒、120 秒启动超时。[Claude 项目服务](https://code.claude.com/docs/en/mcp) · [Codex 项目配置](https://developers.openai.com/codex/config-basic/)

## 验证文档检索

写 API 用法、组件事件或平台兼容性时，在客户端启用已配置的 `uni-doc`。固定版本 `@uni-helper/mcp@0.0.7` 随包提供文档向量表，首次普通安装还会下载并预热嵌入模型。如果首次启动超时，可先在终端运行 `npx -y @uni-helper/mcp@0.0.7` 完成安装，进入 stdio 等待后用 Ctrl+C 退出，再从客户端重试。[上游说明](https://github.com/uni-helper/mcp/tree/v0.0.7) · [模型下载脚本](https://github.com/uni-helper/mcp/blob/v0.0.7/scripts/download-model.mjs)

只需要组件查询时，可在客户端关闭 `uni-doc`，保留 `uni-app-x-mcp`。离线检查核对的是模板交付的两项注册配置；工具能否调用还取决于客户端启用状态和本地模型是否就绪。

请 Agent 调用 `search-docs-by-Uniapp-official`，传入 `{"query":"uni.navigateTo 页面跳转","k":1}`。也可使用与组件查询相同的 Inspector 验证。

```bash
npx -y @modelcontextprotocol/inspector@1.0.6 --cli \
  --config .mcp.json --server uni-doc --method tools/call \
  --tool-name search-docs-by-Uniapp-official --tool-arg 'query=uni.navigateTo 页面跳转' --tool-arg k=1
```

2026-11-25 在 macOS、Node 22.18.0 上通过了两个服务的 stdio 初始化、工具发现和调用。文档检索返回了含 `uni.navigateTo` 说明和 `metadata.source` 的条目。组件查询找到了临时项目的 Vue easycom 组件，空模板返回 `[]`。[检索工具源码](https://github.com/uni-helper/mcp/blob/v0.0.7/src/server/index.ts) · [导航 API 原文](https://uniapp.dcloud.net.cn/api/router.html#navigateto)

如果服务未出现在客户端中，先核对上表中的文件、工作区信任状态和编辑器能否找到 `npx`。如果初始化成功但检索失败，检查首次模型下载和客户端输出。写作时仍可用本地框架 Skill 的对应 reference，或直接打开官方 API 页面核对平台和版本。交接稿记录实际读过的来源与未验证项。[本地 uni-app Skill](../.agents/skills/uni-app/SKILL.md) · [官方文档](https://uniapp.dcloud.net.cn/)
