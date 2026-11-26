# 本地开发环境与接入检测

以下命令从**生成项目的根目录**执行。如果直接开发蓝图内的应用，先进入
`skeleton/`；检查 MCP 时回到蓝图根目录，项目级客户端配置位于那里。

## 安装并检查环境

1. 使用项目 `.nvmrc` 指定的 Node 22，至少 22.13。已安装 nvm 的 macOS/Linux 用户可运行
   `nvm install`、`nvm use`。Windows 用户可选择对应的 Node 安装包。用
   `node -v` 和 `npm -v` 查看当前终端的版本。模板的包管理器版本为 npm 10.9.3。[Node 下载](https://nodejs.org/en/download)
2. 运行 `npm ci` 安装锁文件中的依赖，再运行 `npm run doctor`。它会报告 Node、npm、
   项目 CLI、微信开发者工具和已有的小程序构建产物。开发 H5 时，缺少微信客户端不影响通过。
3. 需要连接自己的后端时，将 `.env.example` 复制为同目录的 `.env`，
   填入开发环境的公开 API 地址。修改后重启开发进程；`VITE_*` 的值会进入客户端。

## 运行 H5 或微信小程序

| 场景           | 命令                      | 怎么确认                                                                                                                   |
| -------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 浏览器开发     | `npm run dev:h5`          | 打开终端打印的本地 URL，默认是 `http://127.0.0.1:5173`。                                                                   |
| 微信模拟器开发 | `npm run dev:mp-weixin`   | 等首次编译完成，保持终端运行，在微信开发者工具导入 `dist/dev/mp-weixin/`。目录内应有 `project.config.json` 和 `app.json`。 |
| 查看生产构建   | `npm run build:mp-weixin` | 导入 `dist/build/mp-weixin/`。生成文件的源配置在 `src/manifest.json` 和 `src/pages.json`。                                 |

在 macOS 或 Windows 安装微信开发者工具后，运行 `npm run doctor -- --weixin` 检查
CLI 安装地址。如果装在自定义目录，可用环境变量 `WECHAT_DEVTOOLS_CLI` 指定
CLI 文件的完整路径。以下是两种终端的写法。[微信开发者工具下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) · [uni-app CLI 开发流程](https://uniapp.dcloud.net.cn/quickstart-cli.html)

```bash
export WECHAT_DEVTOOLS_CLI="/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
```

```powershell
$env:WECHAT_DEVTOOLS_CLI = 'C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat'
```

需要验证 CLI/HTTP 服务时，打开微信开发者工具，在「设置 → 安全设置」查看服务端口。
将实际显示的端口号代入 `npm run doctor -- --weixin --port <端口号>`。
这一步单独查询登录状态。客户端要求鉴权时，按客户端指引操作。需要真实小程序身份的功能，
请先在 `src/manifest.json` 的 `mp-weixin.appid` 配置项目 AppID，再编译和导入。[微信 CLI](https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html) · [微信 HTTP 服务](https://developers.weixin.qq.com/miniprogram/dev/devtools/http.html)

## 检查 Agent 使用的 MCP

默认生成的项目提供以下命令。用 `--no-ai-assets` 生成时，本地开发和微信 CLI
检测仍可使用，MCP 配置、命令和手册会省略。

| 要确认的事                    | 命令                                     | 成功意味着什么                                                                                                    |
| ----------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 项目配置是否完整              | `npm run check:mcp`                      | 六份客户端配置都声明了版本固定的组件查询和文档查询服务，可离线运行。                                              |
| 两个服务能否实际调用          | `npm run check:mcp -- --live`            | 使用项目配置启动 stdio 服务，发现工具并执行组件和文档查询。首次运行可能需下载 npm 包和文档模型。                  |
| 微信客户端自己的 MCP 是否可达 | `npm run check:weixin-mcp -- <本机端点>` | 对 IDE 提供的本机 HTTP MCP 地址完成协议握手并识别工具清单。端点取自该客户端，可能与 CLI/HTTP 状态查询的地址不同。 |

MCP 组件查询读取含 `pages.json` 的 **`src/`**；微信开发者工具导入的是编译出的
**`dist/dev/mp-weixin/`**。空模板的 easycom 查询返回 `[]` 属于有效结果。编辑器是否信任该工作区、
是否已启用服务，还需在对应客户端查看。六种项目配置和微信客户端的接入示例分别见
`docs/agent-mcp.md` 和 `docs/weixin-devtools-mcp.md`。
