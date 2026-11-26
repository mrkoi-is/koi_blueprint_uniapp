import path from "node:path";
import { runInspector } from "./check-mcp-live.mjs";

const usage =
  "Usage: npm run check:weixin-mcp -- <loopback MCP URL from WeChat DevTools>";

// These names come from the IDE's bundled wechatide help / skill tools list.
function hasDevToolsCommands(tools) {
  const names = new Set(tools.map((tool) => tool.name));
  return (
    names.has("check_wechatide_status") ||
    names.has("check_devtools_status") ||
    (names.has("project_list") &&
      (names.has("simulator_open_page") || names.has("simulator_screenshot")))
  );
}

function loopbackEndpoint(value) {
  if (!URL.canParse(value)) return undefined;
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["127.0.0.1", "[::1]", "localhost"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return undefined;
  }
  return url;
}

const args = process.argv.slice(2);
if (args.length === 1 && ["-h", "--help"].includes(args[0])) {
  console.log(usage);
} else {
  const endpoint = args.length === 1 && loopbackEndpoint(args[0]);
  if (!endpoint) {
    console.error(usage);
    console.error(
      "请提供 IDE 显示的本机 HTTP MCP 地址，省略账号、查询参数和片段。",
    );
    process.exitCode = 2;
  } else {
    try {
      const result = await runInspector(
        path.resolve(import.meta.dirname, ".."),
        [endpoint.href, "--transport", "http", "--method", "tools/list"],
      );
      if (!Array.isArray(result?.tools) || !hasDevToolsCommands(result.tools)) {
        console.error(
          "MCP 已响应；返回的清单中未识别微信 IDE 工具。请核对 IDE 导出的端点及客户端启用的工具。",
        );
        process.exitCode = 1;
      } else {
        console.log(
          "PASS 微信开发者工具 MCP 握手成功，工具清单包含微信 IDE 能力。",
        );
      }
    } catch (error) {
      // Errors from a client or server can contain private configuration.
      const reason = error instanceof Error ? error.message : "";
      if (/\b(?:401|403)\b|unauthorized|forbidden/iu.test(reason)) {
        console.error(
          "端点要求鉴权。请在 Agent 客户端本机导入 IDE 导出的配置，再查看工具清单。",
        );
      } else {
        console.error(
          "未能完成 MCP 握手和工具发现。请核对 IDE 是否运行、端点、首次 npm 下载及客户端鉴权。参见 docs/weixin-devtools-mcp.md。",
        );
      }
      process.exitCode = 1;
    }
  }
}
