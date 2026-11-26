import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  options: { live: { type: "boolean", default: false } },
  allowPositionals: true,
});
assert.ok(
  positionals.length <= 1,
  "Usage: check-mcp-config.mjs [root] [--live]",
);
const root = path.resolve(
  positionals[0] ?? path.join(import.meta.dirname, ".."),
);
const packages = {
  "uni-app-x-mcp": "@dcloudio/uni-app-x-mcp@0.0.5",
  "uni-doc": "@uni-helper/mcp@0.0.7",
};

function checkCommands(servers, file, explicitStdio = false) {
  for (const [name, release] of Object.entries(packages)) {
    const entry = servers?.[name];
    const location = `${file} [${name}]`;
    assert.ok(entry, `Missing ${location}`);
    assert.equal(entry.command, "npx", location);
    assert.deepEqual(entry.args, ["-y", release], location);
    if (explicitStdio) assert.equal(entry.type, "stdio", location);
  }
}

for (const [file, key] of [
  [".mcp.json", "mcpServers"],
  [".cursor/mcp.json", "mcpServers"],
  [".gemini/settings.json", "mcpServers"],
  [".kimi-code/mcp.json", "mcpServers"],
  [".vscode/mcp.json", "servers"],
]) {
  const config = JSON.parse(await readFile(path.join(root, file), "utf8"));
  checkCommands(
    config[key],
    file,
    [".mcp.json", ".vscode/mcp.json"].includes(file),
  );
}

// The template's stdio tables use JSON-compatible single-line values.
const codexFile = ".codex/config.toml";
const codex = await readFile(path.join(root, codexFile), "utf8");
const servers = new Map();
let entry;
for (const line of codex.split(/\r?\n/u).map((line) => line.trim())) {
  if (line.startsWith("[")) {
    const section = /^\[mcp_servers\.([\w-]+)\]$/u.exec(line);
    entry = undefined;
    if (section && Object.hasOwn(packages, section[1])) {
      assert.ok(
        !servers.has(section[1]),
        `Duplicate table in ${codexFile}: ${line}`,
      );
      entry = {};
      servers.set(section[1], entry);
    }
    continue;
  }
  const option = /^(command|args)\s*=\s*(.+)$/u.exec(line);
  if (entry && option) {
    assert.ok(
      !Object.hasOwn(entry, option[1]),
      `Duplicate ${option[1]} in ${codexFile}`,
    );
    entry[option[1]] = JSON.parse(option[2]);
  }
}
checkCommands(Object.fromEntries(servers), codexFile);
console.log(
  "All six workspace configurations include both pinned MCP servers.",
);

if (values.live) {
  const { checkLiveServers } = await import("./check-mcp-live.mjs");
  await checkLiveServers(root);
}
