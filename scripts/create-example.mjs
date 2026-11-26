import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const [example, directory, ...extra] = process.argv.slice(2);
const names = ["openapi", "typed-routes", "wot-form"];
if (!names.includes(example) || !directory || extra.length) {
  console.error(
    "Usage: npm run example -- <openapi|typed-routes|wot-form> <empty-directory>",
  );
  process.exit(2);
}

const source = path.join(root, "examples", example);
const output = path.resolve(directory);
const parent = path.dirname(output);
await mkdir(parent, { recursive: true });
const staging = await mkdtemp(path.join(parent, ".koi-example-"));

function node(script, args, cwd = root) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${path.basename(script)} exited with status ${result.status}.`,
    );
}
function read(relative) {
  return readFile(path.join(staging, relative), "utf8");
}
function write(relative, content) {
  return writeFile(path.join(staging, relative), content);
}
function writeJson(relative, content) {
  return write(relative, JSON.stringify(content, null, 2) + "\n");
}

async function applyLock(manifest) {
  const overlay = JSON.parse(
    await readFile(path.join(source, "lock-overlay.json"), "utf8"),
  );
  const baseline = await readFile(
    path.join(root, "skeleton", "package-lock.json"),
  );
  if (
    overlay.baseSha256 !== createHash("sha256").update(baseline).digest("hex")
  ) {
    throw new Error(
      `Refresh the ${example} lock overlay for the current Stable lock. See examples/README.md.`,
    );
  }
  const lock = JSON.parse(await read("package-lock.json"));
  const { section, name, version } = overlay;
  manifest[section][name] = version;
  lock.packages[""][section][name] = version;
  for (const key of overlay.removed) delete lock.packages[key];
  Object.assign(lock.packages, overlay.entries);
  lock.packages = Object.fromEntries(
    Object.entries(lock.packages).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  );
  await writeJson("package-lock.json", lock);
}

async function addHomeAction(component, tag) {
  const file = "src/pages/home/index.vue";
  const text = await read(file);
  if (!text.includes("\n  </view>\n</template>"))
    throw new Error("Stable home markup changed.");
  await write(
    file,
    text
      .replace(
        "import HomeState from",
        `import ${tag} from "./${component}";\nimport HomeState from`,
      )
      .replace(
        "\n  </view>\n</template>",
        `\n    <${tag} />\n  </view>\n</template>`,
      ),
  );
}

try {
  if (
    (
      await readdir(output).catch((error) => {
        if (error.code === "ENOENT") return [];
        throw error;
      })
    ).length
  )
    throw new Error(`Target directory must be empty: ${output}`);

  node(path.join(root, "scripts", "apply-skeleton.mjs"), [
    staging,
    "--name",
    `koi-${example}`,
    "--title",
    "Koi Reference App",
    "--no-ai-assets",
  ]);
  for (const entry of await readdir(source)) {
    if (["lock-overlay.json", "README.md"].includes(entry)) continue;
    await cp(path.join(source, entry), path.join(staging, entry), {
      recursive: true,
    });
  }
  const manifest = JSON.parse(await read("package.json"));
  if (example === "openapi") {
    await applyLock(manifest);
    manifest.scripts["generate:api"] =
      "openapi-typescript contracts/welcome.openapi.json -o src/features/home/generated/welcome.ts && prettier --write src/features/home/generated/welcome.ts";
  } else {
    const pages = JSON.parse(await read("src/pages.json"));
    pages.subPackages = [
      {
        root: "invoice-pages",
        pages: [
          {
            path: example === "wot-form" ? "form/index" : "detail/index",
            style: { navigationBarTitleText: "Invoice" },
          },
        ],
      },
    ];
    if (example === "typed-routes") {
      await addHomeAction("RouteActions.vue", "RouteActions");
      pages.pages.push({
        path: "pages/settings/index",
        style: { navigationBarTitleText: "Settings" },
      });
      pages.tabBar = {
        list: [
          {
            pagePath: "pages/home/index",
            text: "Home",
            iconPath: "static/home.png",
            selectedIconPath: "static/home.png",
          },
          {
            pagePath: "pages/settings/index",
            text: "Settings",
            iconPath: "static/settings.png",
            selectedIconPath: "static/settings.png",
          },
        ],
      };
      manifest.scripts["generate:routes"] = "node scripts/generate-routes.mjs";
      manifest.scripts["validate:fast"] +=
        " && npm run generate:routes -- --check";
    } else {
      await applyLock(manifest);
      await addHomeAction("FormLink.vue", "FormLink");
      const config = await read("tsconfig.json");
      const anchor = '      "@/*": ["src/*"]';
      if (!config.includes(anchor))
        throw new Error("Stable TypeScript paths changed.");
      const componentMappings = ["button", "input"].map(
        (component) =>
          `      "@wot-ui/ui/components/wd-${component}/wd-${component}.vue": [\n` +
          `        "./src/features/invoice/wot-${component}.d.ts"\n      ]`,
      );
      await write(
        "tsconfig.json",
        config.replace(anchor, [anchor, ...componentMappings].join(",\n")),
      );
    }
    await writeJson("src/pages.json", pages);
    if (example === "typed-routes")
      node("scripts/generate-routes.mjs", [], staging);
  }
  await writeJson("package.json", manifest);
  try {
    await rmdir(output);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await rename(staging, output);
  console.log(
    `Created the ${example} example in ${output}. See examples/README.md for validation.`,
  );
} finally {
  await rm(staging, { recursive: true, force: true });
}
