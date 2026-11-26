import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

// Inspector's v1 CLI runs on the template's entire supported Node range.
const inspector = "@modelcontextprotocol/inspector@1.0.6";

function parseResponse(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    // JSON.parse errors can quote source code or credentials from the reply.
    throw new Error(`${label} returned invalid JSON.`);
  }
}

function stopTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    const killed = spawnSync(
      "taskkill",
      ["/pid", String(child.pid), "/t", "/f"],
      {
        stdio: "ignore",
        timeout: 5000,
        windowsHide: true,
      },
    );
    if (killed.status !== 0) child.kill();
  } else {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
}

export async function runInspector(root, args, timeoutMs = 180_000) {
  const invocation = ["-y", inspector, "--cli", ...args];
  let executable = "npx";
  if (process.platform === "win32") {
    // Start npm's JS entry directly so paths and arguments never pass through cmd.exe.
    const npx =
      process.env.npm_execpath &&
      path.basename(process.env.npm_execpath) === "npm-cli.js"
        ? path.join(path.dirname(process.env.npm_execpath), "npx-cli.js")
        : path.join(
            path.dirname(process.execPath),
            "node_modules/npm/bin/npx-cli.js",
          );
    assert.ok(
      existsSync(npx),
      "Cannot locate npx-cli.js. Run this check through npm.",
    );
    executable = process.execPath;
    invocation.unshift(npx);
  }

  const child = spawn(executable, invocation, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    detached: process.platform !== "win32",
  });
  const chunks = [];
  let size = 0;
  let lastError = "";
  let failure;
  function cancel(reason, name = "Error") {
    if (failure) return;
    failure = new Error(reason);
    failure.name = name;
    stopTree(child);
    child.stdout.destroy();
    child.stderr.destroy();
  }
  const interrupt = () => cancel("MCP check interrupted", "AbortError");
  const deadline = setTimeout(
    () =>
      cancel(
        `Inspector timed out after ${timeoutMs / 1000}s; check npm access, server startup and model download.`,
      ),
    timeoutMs,
  );
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    child.stdout.on("data", (chunk) => {
      size += chunk.length;
      if (size > 32 * 1024 * 1024)
        cancel("Inspector response exceeded 32 MiB.");
      else chunks.push(chunk);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      lastError = (lastError + chunk).slice(-1500);
    });
    const code = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    if (failure) throw failure;
    if (code !== 0) {
      const status = /\b(401|403)\b/u.exec(lastError)?.[1];
      const hint = status
        ? `HTTP ${status}: check client authentication.`
        : "Check the npm download, MCP configuration and server startup.";
      throw new Error(`Inspector exited with ${code}. ${hint}`);
    }
    return parseResponse(Buffer.concat(chunks).toString("utf8"), "Inspector");
  } finally {
    clearTimeout(deadline);
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  }
}

async function queryTool(root, server, tool, parameters) {
  const config = ["--config", ".mcp.json", "--server", server];
  const list = await runInspector(root, [...config, "--method", "tools/list"]);
  assert.ok(
    list.tools?.some((item) => item.name === tool),
    `${server} did not advertise ${tool}`,
  );
  console.log(`PASS ${server}: initialize and tools/list (${tool})`);
  const args = [...config, "--method", "tools/call", "--tool-name", tool];
  for (const [key, value] of Object.entries(parameters))
    args.push("--tool-arg", `${key}=${value}`);
  const result = await runInspector(root, args);
  assert.ok(!result.isError, `${server} reported a tool error for ${tool}`);
  const text = result.content?.find((block) => block.type === "text")?.text;
  assert.ok(
    typeof text === "string" && text.length,
    `${server} returned no text`,
  );
  return parseResponse(text, server);
}

async function checkComponents(root) {
  const app = existsSync(path.join(root, "src/pages.json"))
    ? root
    : path.join(root, "skeleton");
  const projectPath = path.join(app, "src");
  assert.ok(
    existsSync(path.join(projectPath, "pages.json")),
    "Cannot find src/pages.json or skeleton/src/pages.json.",
  );
  const components = await queryTool(
    root,
    "uni-app-x-mcp",
    "Query all components under the project",
    { projectPath },
  );
  assert.ok(
    Array.isArray(components) &&
      components.every(
        (item) =>
          typeof item?.name === "string" && typeof item.content === "string",
      ),
    "Invalid easycom result; expected a component array.",
  );
  console.log(
    `PASS uni-app-x-mcp: tools/call returned ${components.length} easycom components from ${projectPath}`,
  );
}

async function checkDocumentation(root) {
  const doc = await queryTool(
    root,
    "uni-doc",
    "search-docs-by-Uniapp-official",
    { query: "uni.navigateTo 页面跳转", k: 1 },
  );
  assert.ok(
    typeof doc?.pageContent === "string" &&
      doc.pageContent.includes("uni.navigateTo") &&
      URL.canParse(doc.metadata?.source) &&
      ["https:", "http:"].includes(new URL(doc.metadata.source).protocol),
    "Invalid uni-doc result; expected uni.navigateTo documentation with a source URL.",
  );
  console.log(
    `PASS uni-doc: tools/call returned documentation from ${new URL(doc.metadata.source).origin}`,
  );
}

export async function checkLiveServers(root) {
  console.log(
    `Live MCP checks use ${inspector}; the first run may download packages and the uni-doc model.`,
  );
  const failed = [];
  for (const [server, check] of [
    ["uni-app-x-mcp", checkComponents],
    ["uni-doc", checkDocumentation],
  ]) {
    try {
      await check(root);
    } catch (error) {
      if (error.name === "AbortError") throw error;
      console.error(`FAIL ${server}: ${error.message}`);
      failed.push(server);
    }
  }
  if (failed.length)
    throw new Error(
      `MCP live check failed for ${failed.join(", ")}. See diagnostics above.`,
    );
}
