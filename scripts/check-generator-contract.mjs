import { spawn } from "node:child_process";
import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const arguments_ = new Set(process.argv.slice(2));
const supportedArguments = new Set(["--full"]);
const errors = [];

for (const argument of arguments_) {
  if (!supportedArguments.has(argument)) {
    throw new Error(`Unknown option: ${argument}`);
  }
}

const full = arguments_.has("--full");
const ignoredDirectoryNames = new Set([
  ".git",
  ".vite",
  "coverage",
  "dist",
  "node_modules",
  "unpackage",
]);
const textExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".less",
  ".md",
  ".mdc",
  ".mjs",
  ".mts",
  ".sass",
  ".scss",
  ".ts",
  ".vue",
  ".yaml",
  ".yml",
]);
const textBasenames = new Set([
  ".editorconfig",
  ".env.example",
  ".gitattributes",
  ".gitignore",
  ".nvmrc",
  "LICENSE",
]);

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isTextFile(filePath) {
  return (
    textExtensions.has(path.extname(filePath).toLowerCase()) ||
    textBasenames.has(path.basename(filePath))
  );
}

async function walk(directory) {
  const entries = (
    await readdir(directory, {
      withFileTypes: true,
    })
  ).sort((left, right) => left.name.localeCompare(right.name));
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function run(command, arguments__, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments__, {
      cwd: options.cwd ?? repositoryRoot,
      env: process.env,
      stdio: options.stdio ?? "inherit",
    });

    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${arguments__.join(" ")} failed${
            signal === null
              ? ` with exit code ${String(code)}`
              : ` after signal ${signal}`
          }.`,
        ),
      );
    });
  });
}

function runExpectFailure(command, arguments__, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments__, {
      cwd: options.cwd ?? repositoryRoot,
      env: process.env,
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${arguments__.join(" ")} unexpectedly succeeded.`,
        ),
      );
    });
  });
}

const temporaryRoot = await mkdtemp(
  path.join(os.tmpdir(), "koi-blueprint-validation-"),
);
const targetRoot = path.join(temporaryRoot, "generated project 空格");
const dryRunRoot = path.join(temporaryRoot, "dry-run-project");
const noAiRoot = path.join(temporaryRoot, "generated-no-ai");
const generatedName = "generated-uni-app";
const generatedTitle = "Generated Uni App";
const generatorPath = path.join(
  repositoryRoot,
  "scripts",
  "apply-skeleton.mjs",
);

try {
  await run(
    process.execPath,
    [
      generatorPath,
      targetRoot,
      "--name",
      generatedName,
      "--title",
      generatedTitle,
    ],
    { cwd: repositoryRoot },
  );

  const generatedRequiredFiles = [
    ".env.example",
    ".gitattributes",
    ".agent/skills/index.yaml",
    "AGENTS.md",
    "LICENSE",
    "docs/ai-quickstart.md",
    "package-lock.json",
    "package.json",
    "profiles/weixin-ai-alpha/README.md",
    "profiles/weixin-ai-alpha/manifest.agent.fragment.json",
    "renovate.json",
    "src/App.vue",
    "src/main.ts",
    "src/manifest.json",
    "src/pages.json",
    "vite.config.ts",
    "vitest.config.mts",
  ];
  for (const relativePath of generatedRequiredFiles) {
    if (!(await exists(path.join(targetRoot, relativePath)))) {
      errors.push(`Generator omitted required file: ${relativePath}`);
    }
  }

  for (const directory of [
    ".git",
    ".vite",
    "coverage",
    "dist",
    "node_modules",
    "unpackage",
  ]) {
    if (await exists(path.join(targetRoot, directory))) {
      errors.push(`Generator copied excluded directory: ${directory}`);
    }
  }

  for (const blueprintOnlyPath of [
    "docs/open-source-top10-audit.md",
    "docs/PROJECT_PLAN.md",
    "docs/reference-audit.md",
    "docs/research/uniapp-top10-2026-07-27.json",
    "specs/001-open-source-top10-audit.md",
  ]) {
    if (await exists(path.join(targetRoot, blueprintOnlyPath))) {
      errors.push(
        `Generator leaked blueprint-only context: ${blueprintOnlyPath}`,
      );
    }
  }

  const generatedFiles = await walk(targetRoot);
  for (const filePath of generatedFiles) {
    if (!isTextFile(filePath)) {
      continue;
    }
    const content = await readFile(filePath, "utf8");
    if (/\{\{[A-Z0-9_]+\}\}/u.test(content)) {
      errors.push(
        `Generator left an unresolved token in ${path.relative(
          targetRoot,
          filePath,
        )}`,
      );
    }
  }

  const generatedPackage = JSON.parse(
    await readFile(path.join(targetRoot, "package.json"), "utf8"),
  );
  if (generatedPackage.name !== generatedName) {
    errors.push("Generator did not replace {{PROJECT_NAME}} in package.json.");
  }

  const generatedManifest = JSON.parse(
    await readFile(path.join(targetRoot, "src/manifest.json"), "utf8"),
  );
  if (generatedManifest.name !== generatedTitle) {
    errors.push(
      "Generator did not replace {{PROJECT_TITLE}} in src/manifest.json.",
    );
  }

  const sentinelPath = path.join(targetRoot, "keep-user-file.txt");
  await writeFile(sentinelPath, "keep\n", "utf8");
  await runExpectFailure(
    process.execPath,
    [
      generatorPath,
      targetRoot,
      "--name",
      generatedName,
      "--title",
      generatedTitle,
    ],
    { cwd: repositoryRoot },
  );
  await run(
    process.execPath,
    [
      generatorPath,
      targetRoot,
      "--name",
      generatedName,
      "--title",
      generatedTitle,
      "--force",
    ],
    { cwd: repositoryRoot, stdio: "ignore" },
  );
  if (!(await exists(sentinelPath))) {
    errors.push("--force deleted an extra user-owned file.");
  }

  await run(
    process.execPath,
    [generatorPath, dryRunRoot, "--name", "dry-run-project", "--dry-run"],
    { cwd: repositoryRoot, stdio: "ignore" },
  );
  if (await exists(dryRunRoot)) {
    errors.push("--dry-run wrote a target directory.");
  }

  await run(
    process.execPath,
    [generatorPath, noAiRoot, "--name", "generated-no-ai", "--no-ai-assets"],
    { cwd: repositoryRoot, stdio: "ignore" },
  );
  for (const aiPath of [
    ".agent",
    ".agents",
    ".codex",
    ".cursor",
    ".gemini",
    ".github/copilot-instructions.md",
    ".kimi-code",
    ".mcp.json",
    "AGENTS.md",
    "CLAUDE.md",
    "GEMINI.md",
    "docs",
    "specs",
  ]) {
    if (await exists(path.join(noAiRoot, aiPath))) {
      errors.push(`--no-ai-assets copied ${aiPath}.`);
    }
  }
  for (const appPath of [
    ".env.example",
    "package-lock.json",
    "package.json",
    "src/main.ts",
  ]) {
    if (!(await exists(path.join(noAiRoot, appPath)))) {
      errors.push(`--no-ai-assets omitted application file ${appPath}.`);
    }
  }

  if (full && errors.length === 0) {
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    console.log("RUN install and validate a freshly generated project.");
    await run(npmCommand, ["ci"], { cwd: targetRoot });
    await run(
      npmCommand,
      ["run", "scaffold:feature", "--", "audit-smoke", "detail"],
      { cwd: targetRoot },
    );
    await runExpectFailure(
      npmCommand,
      ["run", "scaffold:feature", "--", "audit-smoke", "detail"],
      { cwd: targetRoot },
    );
    await run(npmCommand, ["run", "validate"], { cwd: targetRoot });
  }
} catch (error) {
  errors.push(
    `Generator contract failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
} finally {
  await rm(temporaryRoot, {
    force: true,
    recursive: true,
  });
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log("PASS generator option and output contract.");
  if (full) {
    console.log("PASS freshly generated runnable uni-app.");
  }
}
