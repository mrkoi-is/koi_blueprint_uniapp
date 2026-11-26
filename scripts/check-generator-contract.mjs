import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  access,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
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
  ".toml",
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
    ".agent/skills/author-agent-docs/SKILL.md",
    ".agents/skills/uni-app/SKILL.md",
    ".agents/skills/web-design-guidelines/SKILL.md",
    ".cursor/rules/koi-agent-skills.mdc",
    ".github/copilot-instructions.md",
    "CLAUDE.md",
    "GEMINI.md",
    "docs/agent-mcp.md",
    "docs/weixin-devtools-mcp.md",
    "LOCAL_DEVELOPMENT.md",
    "scripts/doctor.mjs",
    "scripts/check-mcp-config.mjs",
    "scripts/check-mcp-live.mjs",
    "scripts/check-weixin-mcp.mjs",
    "scripts/sync-agent-skills.mjs",
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
    "docs/agent-tooling-audit.md",
    "docs/open-source-top10-audit.md",
    "docs/PROJECT_PLAN.md",
    "docs/reference-audit.md",
    "docs/research/uniapp-top10-2026-07-27.json",
    "specs/001-open-source-top10-audit.md",
    "specs/002-agent-authoring-and-mcp.md",
    "specs/003-local-development-checks.md",
  ]) {
    if (await exists(path.join(targetRoot, blueprintOnlyPath))) {
      errors.push(
        `Generator leaked blueprint-only context: ${blueprintOnlyPath}`,
      );
    }
  }

  const checkMcp = [path.join(targetRoot, "scripts/check-mcp-config.mjs")];
  const syncSkills = [path.join(targetRoot, "scripts/sync-agent-skills.mjs")];
  await run(process.execPath, checkMcp, { cwd: targetRoot });
  await run(process.execPath, [...syncSkills, "--check"], { cwd: targetRoot });
  const mcpConfigPath = path.join(targetRoot, ".mcp.json");
  const originalMcp = await readFile(mcpConfigPath, "utf8");
  const mcpConfig = JSON.parse(originalMcp);
  mcpConfig.mcpServers["custom-service"] = {
    command: "local-test-service",
    args: [],
  };
  await writeFile(mcpConfigPath, JSON.stringify(mcpConfig));
  await run(process.execPath, checkMcp, { cwd: targetRoot });
  delete mcpConfig.mcpServers["uni-doc"];
  await writeFile(mcpConfigPath, JSON.stringify(mcpConfig));
  await runExpectFailure(process.execPath, checkMcp, { cwd: targetRoot });
  await writeFile(mcpConfigPath, originalMcp);

  const sources = await readdir(path.join(targetRoot, ".agent/skills"), {
    withFileTypes: true,
  });
  for (const skill of sources.filter((entry) => entry.isDirectory())) {
    const canonical = path.join(
      targetRoot,
      ".agent/skills",
      skill.name,
      "SKILL.md",
    );
    for (const client of [".agents", ".claude"]) {
      const folder = path.join(targetRoot, client, "skills", skill.name);
      const entry = await readFile(path.join(folder, "SKILL.md"), "utf8");
      const target = /\[project Skill\]\(([^)]+)\)/u.exec(entry)?.[1];
      assert.ok(target, `Missing link in ${client} Skill ${skill.name}`);
      assert.equal(path.resolve(folder, target), canonical);
    }
  }

  const generatedFiles = await walk(targetRoot);
  for (const filePath of generatedFiles) {
    assert.notEqual(
      path.basename(filePath),
      ".DS_Store",
      "Generator copied Finder metadata",
    );
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
  assert.equal(generatedPackage.scripts.doctor, "node scripts/doctor.mjs");
  assert.equal(
    generatedPackage.scripts["check:mcp"],
    "node scripts/check-mcp-config.mjs",
  );
  assert.equal(
    generatedPackage.scripts["check:weixin-mcp"],
    "node scripts/check-weixin-mcp.mjs",
  );
  // A clean generation has no installed application dependencies yet.
  await runExpectFailure(process.execPath, ["scripts/doctor.mjs"], {
    cwd: targetRoot,
  });
  await run(process.execPath, ["scripts/check-weixin-mcp.mjs", "--help"], {
    cwd: targetRoot,
    stdio: "ignore",
  });
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

  // Edit a Skill as a consumer would. Stale metadata must be caught, then a
  // refresh must restore discovery without overwriting a custom native entry.
  const author = "author-agent-docs/SKILL.md";
  const source = path.join(targetRoot, ".agent/skills", author);
  const native = path.join(targetRoot, ".agents/skills", author);
  const custom =
    "---\nname: author-agent-docs\ndescription: Local workflow\n---\n";
  await writeFile(
    source,
    (await readFile(source, "utf8")).replace(
      "description: ",
      "description: Updated. ",
    ),
  );
  await runExpectFailure(process.execPath, [...syncSkills, "--check"], {
    cwd: targetRoot,
  });
  // Preserve an alternate spelling of the entry path, as with Windows 8.3 paths.
  const alias = path.join(temporaryRoot, "project-alias");
  await symlink(targetRoot, alias, "junction");
  const stale = spawnSync(
    process.execPath,
    [
      "--preserve-symlinks-main",
      path.join(alias, "scripts/sync-agent-skills.mjs"),
      "--check",
    ],
    { cwd: targetRoot, encoding: "utf8" },
  );
  assert.equal(
    stale.status,
    1,
    "A stale Skill must fail through a directory alias",
  );
  assert.ok(stale.stderr.includes(`.agents/skills/${author}`), stale.stderr);
  assert.ok(stale.stderr.includes(`.claude/skills/${author}`), stale.stderr);
  await run(process.execPath, syncSkills, { cwd: targetRoot });
  await run(process.execPath, [...syncSkills, "--check"], { cwd: targetRoot });
  assert.match(await readFile(native, "utf8"), /description: Updated\./u);
  await writeFile(native, custom);
  await runExpectFailure(process.execPath, syncSkills, { cwd: targetRoot });
  assert.equal(await readFile(native, "utf8"), custom);

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

  const dryRun = execFileSync(
    process.execPath,
    [generatorPath, dryRunRoot, "--name", "dry-run-project", "--dry-run"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  const plannedFiles = Array.from(
    dryRun.matchAll(/^PLAN (.+) \[(?:skeleton|ai-assets)\]\r?$/gmu),
    (match) => match[1],
  );
  assert.deepEqual(
    plannedFiles.sort(),
    generatedFiles.map((file) => path.relative(targetRoot, file)).sort(),
    "Dry run must list the files delivered by a normal generation",
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
    ".claude",
    ".codex",
    ".cursor",
    ".gemini",
    ".github/copilot-instructions.md",
    ".kimi-code",
    ".mcp.json",
    ".vscode",
    "scripts/check-mcp-config.mjs",
    "scripts/check-mcp-live.mjs",
    "scripts/check-weixin-mcp.mjs",
    "scripts/sync-agent-skills.mjs",
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
  const noAiScripts = JSON.parse(
    await readFile(path.join(noAiRoot, "package.json"), "utf8"),
  ).scripts;
  assert.equal(noAiScripts.doctor, generatedPackage.scripts.doctor);
  assert.ok(!Object.hasOwn(noAiScripts, "check:mcp"));
  assert.ok(!Object.hasOwn(noAiScripts, "check:weixin-mcp"));
  assert.ok(!Object.hasOwn(noAiScripts, "check:agent"));
  assert.ok(!noAiScripts.validate.includes("check:agent"));
  for (const appPath of [
    ".env.example",
    "LOCAL_DEVELOPMENT.md",
    "scripts/doctor.mjs",
    "package-lock.json",
    "package.json",
    "src/main.ts",
  ]) {
    if (!(await exists(path.join(noAiRoot, appPath)))) {
      errors.push(`--no-ai-assets omitted application file ${appPath}.`);
    }
  }

  if (full && errors.length === 0) {
    const npmPath = process.env.npm_execpath;
    const npmCommand = npmPath ? process.execPath : "npm";
    const npmArgs = npmPath ? [npmPath] : [];
    console.log("RUN install and validate a freshly generated project.");
    await run(npmCommand, [...npmArgs, "ci"], { cwd: targetRoot });
    await run(npmCommand, [...npmArgs, "run", "doctor"], { cwd: targetRoot });
    await run(
      npmCommand,
      [...npmArgs, "run", "scaffold:feature", "--", "audit-smoke", "detail"],
      { cwd: targetRoot },
    );
    await runExpectFailure(
      npmCommand,
      [...npmArgs, "run", "scaffold:feature", "--", "audit-smoke", "detail"],
      { cwd: targetRoot },
    );
    await run(npmCommand, [...npmArgs, "run", "validate"], { cwd: targetRoot });
    if (process.env.KOI_H5_SMOKE === "1") {
      const install = ["exec", "--", "playwright", "install", "chromium"];
      if (process.platform === "linux") install.push("--with-deps");
      await run(npmCommand, [...npmArgs, ...install], { cwd: targetRoot });
      await run(npmCommand, [...npmArgs, "run", "test:smoke:h5"], {
        cwd: targetRoot,
      });
    }
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
