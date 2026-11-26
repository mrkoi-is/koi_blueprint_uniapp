import { readFile, writeFile } from "node:fs/promises";

const source = new URL("../src/pages.json", import.meta.url);
const output = new URL("../src/platform/uni/page-paths.ts", import.meta.url);
const config = JSON.parse(await readFile(source, "utf8"));
const tabs = new Set(
  (config.tabBar?.list ?? []).map((entry) => "/" + entry.pagePath),
);
const routes = new Set(config.pages.map((entry) => "/" + entry.path));
for (const group of config.subPackages ?? []) {
  for (const entry of group.pages) routes.add(`/${group.root}/${entry.path}`);
}
function declaration(name, paths) {
  const values = paths.sort().map((item) => JSON.stringify(item));
  return `// prettier-ignore\nexport type ${name} = ${values.join(" | ") || "never"};`;
}
const content = [
  "// Generated from src/pages.json by npm run generate:routes.",
  declaration(
    "StackPath",
    [...routes].filter((route) => !tabs.has(route)),
  ),
  declaration("TabPath", [...tabs]),
  "",
].join("\n");
if (process.argv.includes("--check")) {
  if ((await readFile(output, "utf8")) !== content) {
    throw new Error("Route types changed. Run npm run generate:routes.");
  }
} else {
  await writeFile(output, content, "utf8");
}
