import { access, mkdir, readFile, writeFile } from "node:fs/promises";
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

  const collisions = [];
  for (const filePath of files.keys()) {
    try {
      await access(filePath);
      collisions.push(path.relative(projectRoot, filePath));
    } catch {
      // Expected for a new Feature.
    }
  }

  if (collisions.length > 0) {
    console.error(
      `Refusing to overwrite existing files:\n${collisions
        .map((file) => `  ${file}`)
        .join("\n")}`,
    );
    process.exitCode = 1;
  } else {
    for (const [filePath, content] of files) {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf8");
    }

    const pagesConfigPath = path.join(sourceRoot, "pages.json");
    const pagesConfig = JSON.parse(await readFile(pagesConfigPath, "utf8"));
    if (!Array.isArray(pagesConfig.pages)) {
      throw new Error("src/pages.json pages must be an array.");
    }
    pagesConfig.pages.push({
      path: pagePath,
      style: {
        navigationBarTitleText: pascalName,
      },
    });
    await writeFile(
      pagesConfigPath,
      `${JSON.stringify(pagesConfig, null, 2)}\n`,
      "utf8",
    );

    console.log(
      `Created Feature "${featureName}" and route "${pagePath}". Run npm run validate:fast.`,
    );
  }
}
