import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const errors = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function sourceRelative(filePath) {
  return path.relative(sourceRoot, filePath).split(path.sep).join("/");
}

function importsFrom(content) {
  const imports = [];
  const pattern = /(?:from\s+|import\s*\(|require\s*\()\s*["']([^"']+)["']/gu;
  for (const match of content.matchAll(pattern)) {
    if (match[1] !== undefined) {
      imports.push(match[1]);
    }
  }
  const sideEffectPattern = /\bimport\s*["']([^"']+)["']/gu;
  for (const match of content.matchAll(sideEffectPattern)) {
    if (match[1] !== undefined) {
      imports.push(match[1]);
    }
  }
  return imports;
}

function resolveSourceImport(filePath, importPath) {
  if (importPath.startsWith("@/")) {
    return importPath.slice(2);
  }
  if (importPath.startsWith(".")) {
    return sourceRelative(path.resolve(path.dirname(filePath), importPath));
  }
  return undefined;
}

function featureName(filePath) {
  const parts = sourceRelative(filePath).split("/");
  return parts[0] === "features" ? parts[1] : undefined;
}

const sourceFiles = (await walk(sourceRoot)).filter((filePath) =>
  /\.(?:ts|vue)$/u.test(filePath),
);

for (const filePath of sourceFiles) {
  const content = await readFile(filePath, "utf8");
  const file = sourceRelative(filePath);
  const lineCount = content.split("\n").length;

  if (lineCount > 500) {
    errors.push(`${file}: exceeds the 500-line source budget (${lineCount}).`);
  }
  if (/\buni\s*\./u.test(content) && !file.startsWith("platform/")) {
    errors.push(`${file}: uni.* is only allowed under src/platform/.`);
  }
  if (/\bwx\s*\./u.test(content) && !file.startsWith("platform/mp-weixin/")) {
    errors.push(`${file}: wx.* is only allowed under src/platform/mp-weixin/.`);
  }
  if (
    /\b(?:window|document|localStorage|sessionStorage)\b/u.test(content) &&
    !file.startsWith("platform/h5/")
  ) {
    errors.push(
      `${file}: browser globals are only allowed under src/platform/h5/.`,
    );
  }
  if (
    /#ifn?def|#endif/u.test(content) &&
    !file.startsWith("platform/") &&
    file !== "App.vue"
  ) {
    errors.push(
      `${file}: platform conditionals belong in src/platform/ or an app shell.`,
    );
  }
  if (/@ts-ignore/u.test(content)) {
    errors.push(`${file}: @ts-ignore is forbidden; model or narrow the type.`);
  }
  if (/\bconsole\.log\s*\(/u.test(content)) {
    errors.push(`${file}: console.log is forbidden in runtime source.`);
  }

  for (const importPath of importsFrom(content)) {
    const target = resolveSourceImport(filePath, importPath);

    if (
      (file.startsWith("core/") ||
        file.startsWith("platform/") ||
        file.startsWith("shared/") ||
        file.startsWith("stores/")) &&
      target?.startsWith("features/") === true
    ) {
      errors.push(
        `${file}: stable infrastructure cannot import Feature internals (${importPath}).`,
      );
    }

    const isPureFeatureFile =
      file.startsWith("features/") &&
      (file.endsWith("/model.ts") ||
        file.includes("/domain/") ||
        file.includes("/application/") ||
        /\/use-[^/]+\.ts$/u.test(file));
    if (
      file.startsWith("features/") &&
      (target === "platform" ||
        target?.startsWith("platform/") === true ||
        target === "bootstrap" ||
        target?.startsWith("bootstrap/") === true)
    ) {
      errors.push(
        `${file}: Feature code cannot import platform adapters or the composition root (${importPath}).`,
      );
    }
    if (
      isPureFeatureFile &&
      (importPath === "vue" ||
        importPath === "pinia" ||
        importPath === "@dcloudio/uni-app")
    ) {
      errors.push(
        `${file}: model/use-case code must remain framework independent (${importPath}).`,
      );
    }

    const owner = featureName(filePath);
    if (owner !== undefined && target?.startsWith("features/") === true) {
      const targetOwner = target.split("/")[1];
      if (
        targetOwner !== undefined &&
        targetOwner !== owner &&
        !target.endsWith("/public") &&
        !target.endsWith("/public.ts")
      ) {
        errors.push(
          `${file}: cross-Feature imports must use the target public contract (${importPath}).`,
        );
      }
    }

    if (
      file.startsWith("pages/") &&
      (target?.startsWith("core/http/") === true ||
        target?.startsWith("platform/") === true)
    ) {
      errors.push(
        `${file}: pages cannot depend on transport or platform adapters directly (${importPath}).`,
      );
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `PASS architecture boundaries (${String(sourceFiles.length)} source files).`,
  );
}
