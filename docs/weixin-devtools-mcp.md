# 接入微信开发者工具的本机 MCP

需要让 Agent 使用微信 IDE 的项目或模拟器能力时，先运行 `npm run doctor -- --weixin` 检查开发者工具安装情况，再打开 IDE，在设置的安全或 MCP 区域查看该版本提供的接入配置。项目自带的两个 MCP 分别用于 uni-app 组件查询和文档检索；微信 IDE 的服务由本机开发者工具提供。[微信开发者工具下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) · [腾讯 CloudBase 的开发者工具接入说明](https://github.com/TencentCloudBase/skills/blob/main/skills/miniprogram-development/references/devtools-debug-preview.md)

1. 将 **IDE 导出的配置**导入当前 Agent 客户端的本机 MCP 设置。保留导出配置中的传输方式、启动参数和认证字段。含令牌的原始配置留在本机，分享检测结果时只记录成功或失败。
2. 若 IDE 提供了本机 **Streamable HTTP URL**，可在项目根目录运行以下命令。将整个地址替换为 IDE 显示的实际地址；CLI 服务端口、H5 地址和模拟器调试端口各有用途。

   ```bash
   npm run check:weixin-mcp -- "http://127.0.0.1:<实际端口>/mcp"
   ```

3. 命令使用与项目 MCP 实测共用的官方 Inspector。首次运行可能需要从 npm 下载工具。检测从给出的回环地址发起 MCP 握手和 `tools/list`，在工具清单中识别微信 IDE 能力。成功退出码为 0，连接或识别失败为 1，缺少有效本机 URL 为 2。[MCP Streamable HTTP 协议](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
4. 若 IDE 导出的是 stdio 命令、含令牌的 URL 或专用认证头，直接在已导入配置的 Agent 客户端查看工具列表。看到 `check_wechatide_status`（部分版本名为 `check_devtools_status`）或项目管理与模拟器工具，即可确认该客户端的发现结果。遇到 401/403 时，在 IDE 中重新复制本机配置并刷新客户端；无需将令牌填入上述命令。

以 Claude Code 为例，如果 IDE 导出的是无需认证头的 HTTP 地址，在项目根目录用以下命令保存到该项目的本机设置，随后在会话的 `/mcp` 面板查看连接和已发现工具。命令中的端口和路径取自当前 IDE。[Claude Code MCP 配置](https://code.claude.com/docs/en/mcp)

```bash
claude mcp add --scope local --transport http weixin-devtools "http://127.0.0.1:<实际端口>/mcp"
claude mcp get weixin-devtools
```

本机 HTTP 检测只验证运行中的 IDE 服务和工具发现。微信扫码登录、具体工程能否打开及真机渲染分别需要登录状态检查、导入编译产物和设备验证。某些版本另带 `wechatide --help`，可以离线查看该安装包内置的命令与 Skill 版本。
