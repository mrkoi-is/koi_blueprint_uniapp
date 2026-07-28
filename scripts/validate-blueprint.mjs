import { spawn } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const skeletonRoot = path.join(repositoryRoot, "skeleton");
const arguments_ = process.argv.slice(2);

for (const argument of arguments_) {
  if (argument !== "--blueprint-only") {
    throw new Error(`Unknown option: ${argument}`);
  }
}

const blueprintOnly = arguments_.includes("--blueprint-only");
const ignoredDirectoryPattern =
  /^(?:\.git|\.vite|coverage|dist|node_modules|unpackage)$/u;
const textExtensionPattern =
  /\.(?:cjs|css|html|js|json|less|md|mdc|mjs|mts|sass|scss|ts|vue|ya?ml)$/iu;
const textBasenamePattern =
  /^(?:\.editorconfig|\.env\.example|\.gitattributes|\.gitignore|\.nvmrc|LICENSE)$/u;
const requiredFiles = [
  ".gitattributes",
  ".agent/skills/index.yaml",
  ".github/ISSUE_TEMPLATE/bug_report.md",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/feature_request.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/ci.yml",
  "AGENTS.md",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "docs/ai-quickstart.md",
  "docs/architecture/ARCHITECTURE.md",
  "docs/open-source-top10-audit.md",
  "docs/reference-audit.md",
  "docs/research/uniapp-top10-2026-07-27.json",
  "docs/testing.md",
  "docs/vibe-coding-workflow.md",
  "package.json",
  "renovate.json",
  "scripts/apply-skeleton.mjs",
  "scripts/check-generator-contract.mjs",
  "scripts/check-open-source-audit.mjs",
  "scripts/validate-blueprint.mjs",
  "skeleton/.editorconfig",
  "skeleton/.env.example",
  "skeleton/.gitattributes",
  "skeleton/.github/workflows/ci.yml",
  "skeleton/.gitignore",
  "skeleton/.nvmrc",
  "skeleton/LICENSE",
  "skeleton/README.md",
  "skeleton/eslint.config.mjs",
  "skeleton/index.html",
  "skeleton/package-lock.json",
  "skeleton/package.json",
  "skeleton/renovate.json",
  "skeleton/profiles/weixin-ai-alpha/README.md",
  "skeleton/profiles/weixin-ai-alpha/manifest.agent.fragment.json",
  "skeleton/scripts/check-architecture.mjs",
  "skeleton/scripts/check-dcloud-cohort.mjs",
  "skeleton/scripts/check-env-contract.mjs",
  "skeleton/scripts/check-mp-package-budget.mjs",
  "skeleton/scripts/check-routes.mjs",
  "skeleton/scripts/check-weixin-ai-profile.mjs",
  "skeleton/scripts/scaffold-feature.mjs",
  "skeleton/src/App.vue",
  "skeleton/src/bootstrap/container.ts",
  "skeleton/src/core/config/runtime-config.ts",
  "skeleton/src/core/feedback/feedback-port.ts",
  "skeleton/src/core/http/http-client.ts",
  "skeleton/src/core/http/http-error.ts",
  "skeleton/src/env.d.ts",
  "skeleton/src/main.ts",
  "skeleton/src/manifest.json",
  "skeleton/src/pages.json",
  "skeleton/src/platform/uni/feedback-adapter.ts",
  "skeleton/src/platform/uni/runtime-adapter.ts",
  "skeleton/src/platform/uni/uni-http-client.ts",
  "skeleton/src/uni.scss",
  "skeleton/tests/unit/runtime-config.test.ts",
  "skeleton/tests/unit/uni-http-client.test.ts",
  "skeleton/tsconfig.json",
  "skeleton/vite.config.ts",
  "skeleton/vitest.config.mts",
  "specs/000-template.md",
];
const forbiddenLegacyPaths = [
  ".agent/skills/skyline-page/SKILL.md",
  "docs/adr/0001-native-first.md",
  "skeleton/project.config.json",
  "skeleton/project.private.config.example.json",
  "skeleton/src/app.js",
  "skeleton/src/app.json",
  "skeleton/src/app.ts",
  "skeleton/src/sitemap.json",
];
const legacyGuidancePatterns = [
  {
    label: "native WeChat blueprint description",
    pattern:
      /\bblueprint for (?:production-grade )?native WeChat Mini Programs?\b/iu,
  },
  {
    label: "native WeChat baseline declaration",
    pattern:
      /(?:^|\n)(?:-\s*)?Target:\s*native WeChat|Use native WeChat Mini Program structure/iu,
  },
  {
    label: "legacy Chinese native-runtime positioning",
    pattern:
      /面向 AI Agent 与 vibe coding 的微信原生小程序|微信原生运行时\s*\+/u,
  },
  {
    label: "legacy native-default statement",
    pattern: /(?:default remains native WeChat|默认选择微信原生)/iu,
  },
  {
    label: "legacy source miniprogramRoot instruction",
    pattern: /\bminiprogramRoot\b/u,
  },
  {
    label: "legacy app.json route-source assertion",
    pattern: /Route checks prove every `app\.json` page/iu,
  },
];
const activeGuidancePrefixes = [
  ".agent/",
  ".cursor/",
  ".github/copilot-instructions.md",
  "AGENTS.md",
  "CLAUDE.md",
  "CONTRIBUTING.md",
  "README.md",
  "README_ZH.md",
  "docs/PROJECT_PLAN.md",
  "docs/ai-quickstart.md",
  "docs/architecture/",
  "docs/testing.md",
  "docs/vibe-coding-workflow.md",
  "skeleton/README.md",
];
const tokenExpectations = new Map([
  ["index.html", "{{PROJECT_TITLE}}"],
  ["README.md", "{{PROJECT_TITLE}}"],
  ["package-lock.json", "{{PROJECT_NAME}}"],
  ["package.json", "{{PROJECT_NAME}}"],
  ["src/core/config/runtime-config.ts", "{{PROJECT_TITLE}}"],
  ["src/manifest.json", "{{PROJECT_TITLE}}"],
  ["src/pages.json", "{{PROJECT_TITLE}}"],
]);
const allowedTemplateTokens = new Set(["PROJECT_NAME", "PROJECT_TITLE"]);
const errors = [];

function exists(filePath) {
  return access(filePath).then(
    () => true,
    () => false,
  );
}

function isTextFile(filePath) {
  const basename = path.basename(filePath);
  return (
    textExtensionPattern.test(basename) || textBasenamePattern.test(basename)
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
    if (entry.isDirectory() && ignoredDirectoryPattern.test(entry.name)) {
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

async function readJson(relativePath) {
  const filePath = path.join(repositoryRoot, relativePath);
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    errors.push(
      `Invalid JSON in ${relativePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return undefined;
  }
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

function isActiveGuidance(relativePath) {
  return activeGuidancePrefixes.some(
    (prefix) => relativePath === prefix || relativePath.startsWith(prefix),
  );
}

async function validateStructure() {
  for (const relativePath of requiredFiles) {
    if (!(await exists(path.join(repositoryRoot, relativePath)))) {
      errors.push(`Missing required blueprint file: ${relativePath}`);
    }
  }

  for (const relativePath of forbiddenLegacyPaths) {
    if (await exists(path.join(repositoryRoot, relativePath))) {
      errors.push(`Legacy source file must be removed: ${relativePath}`);
    }
  }

  if (await exists(path.join(skeletonRoot, ".git"))) {
    errors.push("skeleton/.git must never be copied into generated projects.");
  }

  const skillIndexPath = path.join(repositoryRoot, ".agent/skills/index.yaml");
  if (await exists(skillIndexPath)) {
    const skillIndex = await readFile(skillIndexPath, "utf8");
    for (const match of skillIndex.matchAll(/entry:\s*"([^"]+)"/gu)) {
      const entry = match[1];
      if (
        entry !== undefined &&
        !(await exists(path.join(repositoryRoot, entry)))
      ) {
        errors.push(`Skill index points to a missing entry: ${entry}`);
      }
    }
  }

  const skeletonFiles = await walk(skeletonRoot);
  for (const filePath of skeletonFiles) {
    const relativePath = path.relative(repositoryRoot, filePath);
    const skeletonRelativePath = path.relative(skeletonRoot, filePath);
    const basename = path.basename(filePath);

    if (basename === ".DS_Store" || basename === ".git") {
      errors.push(`Forbidden generated-project input: ${relativePath}`);
    }

    if (
      skeletonRelativePath.startsWith(`src${path.sep}`) &&
      [".wxml", ".wxs", ".wxss"].includes(path.extname(filePath).toLowerCase())
    ) {
      errors.push(
        `Legacy native source file is not valid in the uni-app source tree: ${relativePath}`,
      );
    }

    if (!isTextFile(filePath)) {
      continue;
    }

    const content = await readFile(filePath, "utf8");
    for (const match of content.matchAll(/\{\{([A-Z0-9_]+)\}\}/gu)) {
      const token = match[1];
      if (token !== undefined && !allowedTemplateTokens.has(token)) {
        errors.push(`Unknown template token {{${token}}} in ${relativePath}`);
      }
    }
  }

  for (const [relativePath, token] of tokenExpectations) {
    const filePath = path.join(skeletonRoot, relativePath);
    if (!(await exists(filePath))) {
      continue;
    }
    const content = await readFile(filePath, "utf8");
    if (!content.includes(token)) {
      errors.push(
        `Expected ${token} in skeleton/${relativePath} for project generation.`,
      );
    }
  }

  const repositoryFiles = await walk(repositoryRoot);
  for (const filePath of repositoryFiles) {
    const relativePath = path.relative(repositoryRoot, filePath);
    if (!isActiveGuidance(relativePath) || !isTextFile(filePath)) {
      continue;
    }

    const content = await readFile(filePath, "utf8");
    for (const { label, pattern } of legacyGuidancePatterns) {
      if (pattern.test(content)) {
        errors.push(`Found ${label} in active guidance: ${relativePath}`);
      }
    }
  }

  const rootPackage = await readJson("package.json");
  if (rootPackage !== undefined) {
    if (
      typeof rootPackage.description !== "string" ||
      !rootPackage.description.includes("uni-app")
    ) {
      errors.push(
        "Root package description must identify the uni-app blueprint.",
      );
    }
    if (
      rootPackage.scripts?.validate !== "node scripts/validate-blueprint.mjs"
    ) {
      errors.push(
        "Root npm run validate must execute scripts/validate-blueprint.mjs.",
      );
    }
    if (
      rootPackage.scripts?.["check:audit"] !==
      "node scripts/check-open-source-audit.mjs"
    ) {
      errors.push(
        "Root npm run check:audit must execute scripts/check-open-source-audit.mjs.",
      );
    }
    if (
      rootPackage.scripts?.["check:generator"] !==
      "node scripts/check-generator-contract.mjs"
    ) {
      errors.push(
        "Root npm run check:generator must execute scripts/check-generator-contract.mjs.",
      );
    }
  }

  const skeletonPackage = await readJson("skeleton/package.json");
  if (skeletonPackage !== undefined) {
    const requiredScripts = [
      "build:targets",
      "build:h5",
      "build:mp-weixin",
      "check:architecture",
      "check:dcloud-cohort",
      "check:env",
      "check:mp-budget",
      "check:routes",
      "check:weixin-ai-profile",
      "format:check",
      "lint",
      "scaffold:feature",
      "test",
      "test:coverage",
      "typecheck",
      "validate:fast",
      "validate",
    ];
    for (const script of requiredScripts) {
      if (typeof skeletonPackage.scripts?.[script] !== "string") {
        errors.push(`skeleton/package.json is missing script "${script}".`);
      }
    }

    const requiredDependencies = [
      "@dcloudio/uni-app",
      "@dcloudio/uni-components",
      "@dcloudio/uni-h5",
      "@dcloudio/uni-mp-weixin",
      "@dcloudio/vite-plugin-uni",
      "pinia",
      "vite",
      "vue",
    ];
    const allDependencies = {
      ...skeletonPackage.dependencies,
      ...skeletonPackage.devDependencies,
    };
    for (const dependency of requiredDependencies) {
      if (typeof allDependencies[dependency] !== "string") {
        errors.push(
          `skeleton/package.json is missing dependency "${dependency}".`,
        );
      }
    }
  }

  if (
    (await readFile(path.join(repositoryRoot, "renovate.json"), "utf8")) !==
    (await readFile(path.join(skeletonRoot, "renovate.json"), "utf8"))
  ) {
    errors.push(
      "Root and generated-project Renovate cohort policies must stay identical.",
    );
  }

  const manifest = await readJson("skeleton/src/manifest.json");
  if (manifest !== undefined) {
    if (manifest.vueVersion !== "3") {
      errors.push("skeleton/src/manifest.json must select Vue 3.");
    }
    if (typeof manifest.h5 !== "object" || manifest.h5 === null) {
      errors.push("skeleton/src/manifest.json must configure the H5 target.");
    }
    if (
      typeof manifest["mp-weixin"] !== "object" ||
      manifest["mp-weixin"] === null
    ) {
      errors.push(
        "skeleton/src/manifest.json must configure the mp-weixin target.",
      );
    }
  }

  const pages = await readJson("skeleton/src/pages.json");
  if (
    pages !== undefined &&
    (!Array.isArray(pages.pages) || pages.pages.length === 0)
  ) {
    errors.push("skeleton/src/pages.json must declare at least one page.");
  }

  return skeletonFiles.length;
}

async function validateGeneratorContract() {
  try {
    const contractArguments = [
      path.join(repositoryRoot, "scripts", "check-generator-contract.mjs"),
    ];
    if (!blueprintOnly) {
      contractArguments.push("--full");
    }

    await run(process.execPath, contractArguments);
  } catch (error) {
    errors.push(
      `Generator smoke test failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function validateOpenSourceAudit() {
  try {
    await run(process.execPath, [
      path.join(repositoryRoot, "scripts", "check-open-source-audit.mjs"),
    ]);
  } catch (error) {
    errors.push(
      `Open-source audit contract failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function reportErrors() {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
}

const skeletonFileCount = await validateStructure();
await validateOpenSourceAudit();
if (errors.length > 0) {
  reportErrors();
} else {
  console.log(
    `PASS blueprint structure (${String(skeletonFileCount)} skeleton files).`,
  );
  await validateGeneratorContract();

  if (errors.length > 0) {
    reportErrors();
  }
}
