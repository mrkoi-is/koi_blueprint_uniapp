import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const skeletonRoot = path.join(repositoryRoot, "skeleton");
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
  ".wxml",
  ".wxs",
  ".wxss",
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
const skippedSegments = new Set([
  ".DS_Store",
  ".git",
  ".vite",
  "coverage",
  "dist",
  "node_modules",
  "unpackage",
]);

function usage() {
  console.log(`Usage:
  node scripts/apply-skeleton.mjs <target> [options]

Options:
  --name <npm-slug>   Project/package name (defaults to target basename)
  --title <text>      Visible uni-app title (defaults to project name)
  --dry-run           Print the file plan without writing
  --force             Overwrite colliding files; never deletes extra files
  --no-ai-assets      Skip editor-agent bridges, Skills, shared docs, and specs
  --no-install        Accepted explicitly; installation is never automatic
  --no-git            Accepted explicitly; Git initialization is never automatic`);
}

function parseArguments(arguments_) {
  const options = {
    aiAssets: true,
    dryRun: false,
    force: false,
    name: undefined,
    target: undefined,
    title: undefined,
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--force") {
      options.force = true;
    } else if (argument === "--no-ai-assets") {
      options.aiAssets = false;
    } else if (argument === "--no-install" || argument === "--no-git") {
      // Safe defaults are already no install and no Git initialization.
    } else if (argument === "--name" || argument === "--title") {
      const value = arguments_[index + 1];
      if (value === undefined) {
        throw new Error(`${argument} requires a value.`);
      }
      index += 1;
      if (argument === "--name") {
        options.name = value;
      } else {
        options.title = value;
      }
    } else if (argument?.startsWith("--") === true) {
      throw new Error(`Unknown option: ${argument}`);
    } else if (options.target === undefined) {
      options.target = argument;
    } else {
      throw new Error(`Unexpected positional argument: ${argument}`);
    }
  }

  return options;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function containsPath(parentPath, candidatePath) {
  const relativePath = path.relative(parentPath, candidatePath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== ".." &&
      !path.isAbsolute(relativePath))
  );
}

async function collectFiles(sourceRoot, destinationRoot, label) {
  const output = [];

  async function visit(directory) {
    const entries = (
      await readdir(directory, {
        withFileTypes: true,
      })
    ).sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (skippedSegments.has(entry.name)) {
        continue;
      }
      const sourcePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(sourcePath);
      } else {
        output.push({
          destinationPath: path.join(
            destinationRoot,
            path.relative(sourceRoot, sourcePath),
          ),
          label,
          sourcePath,
        });
      }
    }
  }

  await visit(sourceRoot);
  return output;
}

const options = parseArguments(process.argv.slice(2));
if (options.target === undefined) {
  usage();
  process.exitCode = 2;
} else {
  const targetRoot = path.resolve(options.target);
  const rootPath = path.parse(targetRoot).root;
  if (targetRoot === rootPath) {
    throw new Error("The filesystem root cannot be a project target.");
  }
  if (
    containsPath(repositoryRoot, targetRoot) ||
    containsPath(targetRoot, repositoryRoot)
  ) {
    throw new Error(
      "The project target cannot overlap the blueprint repository.",
    );
  }

  const projectName = options.name ?? path.basename(targetRoot);
  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(projectName)) {
    throw new Error(
      "Project name must be an npm-safe lowercase slug (letters, digits, ., _, -).",
    );
  }
  const projectTitle = options.title ?? projectName;
  if (projectTitle.trim().length === 0) {
    throw new Error("Project title cannot be empty.");
  }
  if (/["\\<>&\u0000-\u001F]/u.test(projectTitle)) {
    throw new Error(
      "Project title cannot contain quotes, backslashes, HTML delimiters, or control characters.",
    );
  }

  const filePlan = await collectFiles(skeletonRoot, targetRoot, "skeleton");
  if (options.aiAssets) {
    const aiDirectories = [".agent", ".cursor"];
    for (const directory of aiDirectories) {
      filePlan.push(
        ...(await collectFiles(
          path.join(repositoryRoot, directory),
          path.join(targetRoot, directory),
          "ai-assets",
        )),
      );
    }

    const aiFiles = [
      "AGENTS.md",
      "CLAUDE.md",
      ".github/copilot-instructions.md",
      "docs/adr/0000-template.md",
      "docs/adr/0001-uni-app-h5-mp-weixin.md",
      "docs/ai-quickstart.md",
      "docs/architecture/ARCHITECTURE.md",
      "docs/architecture/PROJECT_STRUCTURE.md",
      "docs/testing.md",
      "docs/vibe-coding-workflow.md",
      "specs/000-template.md",
    ];
    for (const relativePath of aiFiles) {
      filePlan.push({
        destinationPath: path.join(targetRoot, relativePath),
        label: "ai-assets",
        sourcePath: path.join(repositoryRoot, relativePath),
      });
    }
  }

  const collisions = [];
  for (const item of filePlan) {
    if (await exists(item.destinationPath)) {
      collisions.push(path.relative(targetRoot, item.destinationPath));
    }
  }

  if (collisions.length > 0 && !options.force) {
    throw new Error(
      `Target has ${String(
        collisions.length,
      )} colliding files. Re-run with --force to overwrite only those files:\n${collisions
        .slice(0, 20)
        .map((file) => `  ${file}`)
        .join("\n")}`,
    );
  }

  const replacements = new Map([
    ["{{PROJECT_NAME}}", projectName],
    ["{{PROJECT_TITLE}}", projectTitle],
  ]);

  for (const item of filePlan) {
    const relativePath = path.relative(targetRoot, item.destinationPath);
    if (options.dryRun) {
      console.log(`PLAN ${relativePath} [${item.label}]`);
      continue;
    }

    await mkdir(path.dirname(item.destinationPath), {
      recursive: true,
    });

    const extension = path.extname(item.sourcePath).toLowerCase();
    if (
      textExtensions.has(extension) ||
      textBasenames.has(path.basename(item.sourcePath))
    ) {
      let content = await readFile(item.sourcePath, "utf8");
      for (const [token, replacement] of replacements) {
        content = content.replaceAll(token, replacement);
      }
      await writeFile(item.destinationPath, content, "utf8");
    } else {
      await copyFile(item.sourcePath, item.destinationPath);
    }
  }

  console.log(
    `${options.dryRun ? "Planned" : "Created"} ${String(
      filePlan.length,
    )} files for "${projectName}" at ${targetRoot}.`,
  );
  if (!options.dryRun) {
    console.log("Next: npm ci && npm run validate");
  }
}
