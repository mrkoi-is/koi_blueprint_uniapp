import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  blueprintRepository,
  commitPattern,
  sourceFile,
} from "./blueprint-source.mjs";

const blueprint = path.resolve(import.meta.dirname, "..");

function run(cwd, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  return result;
}

function output(result, allowed = [0]) {
  if (!allowed.includes(result.status)) {
    throw new Error(
      result.stderr?.trim() ||
        result.stdout?.trim() ||
        `Command failed (status ${result.status ?? result.signal}).`,
    );
  }
  return result.stdout ?? "";
}

function gitResult(cwd, ...args) {
  return run(cwd, "git", ["--no-optional-locks", ...args]);
}

function git(cwd, ...args) {
  return output(gitResult(cwd, ...args));
}

function parseCommand() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      to: { type: "string" },
      from: { type: "string" },
      name: { type: "string" },
      title: { type: "string" },
      "no-ai-assets": { type: "boolean" },
      "ai-assets": { type: "boolean" },
      "show-conflict": { type: "string" },
    },
  });
  const [command, project, ...extra] = positionals;
  if (command !== "preview" || !project || !values.to || extra.length) {
    throw new Error(
      "Usage: npm run upgrade -- preview <app-root> --to <commit> [--from <commit> --name <slug> --title <title> (--ai-assets | --no-ai-assets)]",
    );
  }
  return { command, project, values };
}

function assertCommit(commit) {
  if (typeof commit !== "string" || !commitPattern.test(commit)) {
    throw new Error("Use the full 40-character blueprint commit SHA.");
  }
  if (
    gitResult(blueprint, "cat-file", "-e", commit + "^{commit}").status !== 0
  ) {
    throw new Error(
      `Blueprint commit ${commit} is unavailable. Fetch the history and retry.`,
    );
  }
}

function sourceAt(project, head, values) {
  const hasSource = git(project, "ls-tree", head, "--", sourceFile).length > 0;
  const source = hasSource
    ? JSON.parse(git(project, "show", `${head}:${sourceFile}`))
    : {};
  if (
    hasSource &&
    (source.schemaVersion !== 1 ||
      source.repository !== blueprintRepository ||
      source.profile !== "stable")
  ) {
    throw new Error(
      "Unsupported blueprint source record. This upgrade workflow supports Koi Stable projects.",
    );
  }
  const commit = source.commit ?? values.from;
  const name = source.name ?? values.name;
  const title = source.title ?? values.title;
  const aiAssets =
    source.aiAssets ??
    (values["no-ai-assets"] ? false : values["ai-assets"] ? true : undefined);
  if (
    (values.from && source.commit && source.commit !== values.from) ||
    (values.name && source.name && source.name !== values.name) ||
    (values.title && source.title && source.title !== values.title) ||
    (values["ai-assets"] && values["no-ai-assets"]) ||
    (values["ai-assets"] && source.aiAssets === false) ||
    (values["no-ai-assets"] && source.aiAssets === true)
  ) {
    throw new Error(
      "Explicit options must agree with the recorded generation inputs.",
    );
  }
  if (
    !commit ||
    typeof name !== "string" ||
    typeof title !== "string" ||
    typeof aiAssets !== "boolean"
  ) {
    throw new Error(
      "Source is unconfirmed. Find the original commit and generation options, or compare a fresh target render manually. See the upgrade guide.",
    );
  }
  assertCommit(commit);
  return {
    schemaVersion: 1,
    repository: blueprintRepository,
    commit,
    name,
    title,
    aiAssets,
    profile: "stable",
  };
}

async function render(workspace, label, source) {
  const checkout = path.join(workspace, label + "-source");
  const archive = checkout + ".tar";
  const app = path.join(workspace, label + "-app");
  await mkdir(checkout);
  git(
    blueprint,
    "archive",
    "--format=tar",
    "--output=" + archive,
    source.commit,
  );
  output(run(checkout, "tar", ["-xf", archive]));
  const args = [
    path.join(checkout, "scripts", "apply-skeleton.mjs"),
    app,
    "--name",
    source.name,
    "--title",
    source.title,
  ];
  if (!source.aiAssets) args.push("--no-ai-assets");
  output(run(checkout, process.execPath, args));
  await rm(path.join(app, sourceFile), { force: true });
  return app;
}

function renderedCommit(repo, app, label, parent) {
  git(repo, "--work-tree=" + app, "add", "--all", "--force", "--", ".");
  const tree = git(repo, "write-tree").trim();
  return commitTree(repo, tree, label, parent);
}

function commitTree(repo, tree, label, parent) {
  return git(
    repo,
    "commit-tree",
    tree,
    "-m",
    label,
    ...(parent ? ["-p", parent] : []),
  ).trim();
}

async function prepare(workspace, project, head, source, target) {
  const oldApp = await render(workspace, "old", source);
  const newApp = await render(workspace, "new", { ...source, commit: target });
  const repo = path.join(workspace, "merge");
  await mkdir(repo);
  git(repo, "init", "-q");
  git(repo, "config", "user.name", "Koi blueprint upgrade");
  git(repo, "config", "user.email", "upgrade@localhost");
  git(repo, "config", "core.autocrlf", "false");
  git(repo, "fetch", "--quiet", "--no-tags", project, head);
  const old = renderedCommit(repo, oldApp, "Original blueprint", undefined);
  const next = renderedCommit(repo, newApp, "Target blueprint", old);
  const local = commitTree(
    repo,
    git(repo, "rev-parse", head + "^{tree}").trim(),
    "Current app",
    old,
  );
  return { repo, old, local, next };
}

function skipPrivatePaths(file) {
  return (
    /^(?:node_modules|dist|unpackage|coverage)\//u.test(file) ||
    /(?:^|\/)(?:\.env(?:\.(?!example$)[^/]+)?|project\.private\.config\.json|private\.[^/]+\.key)$/u.test(
      file,
    )
  );
}

function inspectMerge({ repo, local, next }) {
  const merge = gitResult(
    repo,
    "merge-tree",
    "--write-tree",
    "--name-only",
    "-z",
    local,
    next,
  );
  const fields = output(merge, [0, 1]).split("\0");
  const tree = fields.shift();
  const conflicts = [];
  if (merge.status === 1) {
    for (const file of fields) {
      if (!file) break;
      conflicts.push(file);
    }
  }
  const diff = git(
    repo,
    "diff",
    "--name-status",
    "-z",
    "--no-renames",
    local,
    tree,
  ).split("\0");
  const changes = new Map();
  for (let i = 0; i + 1 < diff.length; i += 2) {
    const [status, file] = [diff[i], diff[i + 1]];
    if (!conflicts.includes(file)) changes.set(file, status);
  }
  for (const file of conflicts) changes.set(file, "CONFLICT");
  if (changes.has(sourceFile) || [...changes.keys()].some(skipPrivatePaths)) {
    throw new Error(
      "The target changes provenance or private/generated paths. Review the two versions manually.",
    );
  }
  return changes;
}

function showConflict(snapshots, changes, file) {
  if (changes.get(file) !== "CONFLICT") {
    throw new Error("Select a path listed as CONFLICT.");
  }
  for (const [label, commit] of [
    ["old blueprint", snapshots.old],
    ["current app", snapshots.local],
    ["new blueprint", snapshots.next],
  ]) {
    const blob = gitResult(snapshots.repo, "show", `${commit}:${file}`);
    const content =
      blob.status !== 0
        ? "(absent)"
        : blob.stdout.includes("\0")
          ? "(binary)"
          : blob.stdout;
    console.log(`--- ${label}\n${content}`);
  }
}

async function resolveProject(projectArgument) {
  const project = await realpath(projectArgument);
  const root = await realpath(
    git(project, "rev-parse", "--show-toplevel").trim(),
  );
  if (
    path.relative(project, root) ||
    !path.relative(await realpath(blueprint), root)
  ) {
    throw new Error("Provide the root of a separate generated Git project.");
  }
  return project;
}

async function main() {
  const { project: projectArgument, values } = parseCommand();
  const project = await resolveProject(projectArgument);
  const head = git(project, "rev-parse", "HEAD").trim();
  const source = sourceAt(project, head, values);
  const target = values.to;
  assertCommit(target);
  const manifest = JSON.parse(
    git(project, "show", `${head}:src/manifest.json`),
  );
  if (manifest["mp-weixin"]?.agent !== undefined) {
    throw new Error(
      "This project has an active Weixin AI Alpha profile. Review upgrades separately.",
    );
  }
  console.log(`App HEAD ${head}\nBlueprint ${source.commit} → ${target}`);
  const workspace = await mkdtemp(
    path.join(os.tmpdir(), "koi-upgrade-preview-"),
  );
  try {
    const snapshots = await prepare(workspace, project, head, source, target);
    const changes = inspectMerge(snapshots);
    if (values["show-conflict"])
      showConflict(snapshots, changes, values["show-conflict"]);
    for (const [file, status] of changes) console.log(`${status}\t${file}`);
    if (changes.size === 0) console.log("No file changes.");
    if ([...changes.values()].includes("CONFLICT")) {
      console.log(
        "Compare each conflict in the old render, app HEAD, and new render.",
      );
      process.exitCode = 1;
    }
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
