import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  rmdir,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const testsRoot = path.join(projectRoot, "tests", "unit");
const [featureName, pageName = "index"] = process.argv.slice(2);
const safeName = /^[a-z][a-z0-9-]*$/u;

if (
  featureName === undefined ||
  !safeName.test(featureName) ||
  !safeName.test(pageName)
) {
  console.error(
    "Usage: npm run scaffold:feature -- <kebab-feature> [kebab-page]",
  );
  process.exitCode = 2;
} else {
  const pascalName = featureName
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join("");
  const featureRoot = path.join(sourceRoot, "features", featureName);
  const pagePath = `pages/${featureName}/${pageName}`;
  const pageFile = path.join(sourceRoot, `${pagePath}.vue`);
  const files = new Map([
    [
      path.join(featureRoot, "model.ts"),
      `export interface ${pascalName}Model {\n  readonly title: string;\n}\n`,
    ],
    [
      path.join(featureRoot, `use-${featureName}.ts`),
      `import type { ${pascalName}Model } from "./model";\n\nexport function create${pascalName}(title: string): ${pascalName}Model {\n  return { title };\n}\n`,
    ],
    [
      path.join(featureRoot, "public.ts"),
      `export type { ${pascalName}Model } from "./model";\nexport { create${pascalName} } from "./use-${featureName}";\n`,
    ],
    [
      pageFile,
      `<script setup lang="ts">\nimport { create${pascalName} } from "../../features/${featureName}/public";\n\nconst model = create${pascalName}("${pascalName}");\n</script>\n\n<template>\n  <view class="${featureName}">{{ model.title }}</view>\n</template>\n\n<style scoped lang="scss">\n.${featureName} {\n  padding: 32rpx;\n}\n</style>\n`,
    ],
    [
      path.join(testsRoot, `${featureName}.test.ts`),
      `import { describe, expect, it } from "vitest";\n\nimport { create${pascalName} } from "../../src/features/${featureName}/use-${featureName}";\n\ndescribe("create${pascalName}", () => {\n  it("creates the model", () => {\n    expect(create${pascalName}("${pascalName}")).toEqual({ title: "${pascalName}" });\n  });\n});\n`,
    ],
  ]);

  const pagesConfigPath = path.join(sourceRoot, "pages.json");
  const lockPath = path.join(sourceRoot, ".koi-scaffold.lock");
  let lock;
  try {
    lock = await open(lockPath, "wx");
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    console.error(
      "A Feature scaffold is already running. Retry when it finishes. If it was interrupted, inspect its files before removing src/.koi-scaffold.lock.",
    );
    process.exitCode = 1;
  }

  if (lock) {
    const created = [];
    const directories = [];
    let stagedRoute;
    try {
      const original = await readFile(pagesConfigPath, "utf8");
      const pagesConfig = JSON.parse(original);
      if (
        !Array.isArray(pagesConfig?.pages) ||
        pagesConfig.pages.some((page) => typeof page?.path !== "string")
      ) {
        throw new Error("src/pages.json pages must be an array of routes.");
      }
      if (
        pagesConfig.pages.some((page) => page.path === pagePath) ||
        (pagesConfig.subPackages ?? []).some((group) =>
          group.pages.some((page) => `${group.root}/${page.path}` === pagePath),
        )
      ) {
        throw new Error(`Route already exists: ${pagePath}`);
      }
      for (const filePath of files.keys()) {
        try {
          await lstat(filePath);
          throw new Error(
            `Refusing to overwrite ${path.relative(projectRoot, filePath)}`,
          );
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }

      pagesConfig.pages.push({
        path: pagePath,
        style: { navigationBarTitleText: pascalName },
      });
      const tempPath = `${pagesConfigPath}.${randomUUID()}.tmp`;
      const routeMode = (await stat(pagesConfigPath)).mode & 0o777;
      const stage = await open(tempPath, "wx", routeMode);
      stagedRoute = tempPath;
      try {
        await stage.writeFile(`${JSON.stringify(pagesConfig, null, 2)}\n`);
        if (process.platform !== "win32") await stage.chmod(routeMode);
      } finally {
        await stage.close();
      }
      for (const [filePath, content] of files) {
        const directory = await mkdir(path.dirname(filePath), {
          recursive: true,
        });
        for (
          let dir = path.dirname(filePath);
          directory;
          dir = path.dirname(dir)
        ) {
          directories.push(dir);
          if (dir === directory) break;
        }
        const file = await open(filePath, "wx");
        created.push(filePath);
        try {
          await file.writeFile(content, "utf8");
        } finally {
          await file.close();
        }
      }
      if ((await readFile(pagesConfigPath, "utf8")) !== original) {
        throw new Error(
          "src/pages.json changed during scaffolding. Retry with the current routes.",
        );
      }
      await rename(stagedRoute, pagesConfigPath);
      stagedRoute = undefined;
      console.log(
        `Created Feature "${featureName}" and route "${pagePath}". Run npm run validate:fast.`,
      );
    } catch (error) {
      console.error(`ERROR ${error.message}`);
      process.exitCode = 1;
      for (const file of created) await unlink(file);
      for (const directory of directories) {
        try {
          await rmdir(directory);
        } catch (cleanupError) {
          if (cleanupError.code !== "ENOTEMPTY") throw cleanupError;
        }
      }
    } finally {
      try {
        if (stagedRoute) await unlink(stagedRoute);
      } finally {
        await lock.close();
        await unlink(lockPath);
      }
    }
  }
}
