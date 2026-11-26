import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
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
      "expect-head": { type: "string" },
    },
  });
  const [command, project, ...extra] = positionals;
  const startsUpgrade = command === "preview" || command === "apply";
  const resumesUpgrade = command === "continue" || command === "abort";
  if (
    !project ||
    extra.length ||
    (!startsUpgrade && !resumesUpgrade) ||
    (startsUpgrade && !values.to) ||
    (resumesUpgrade && Object.keys(values).length) ||
    (command === "apply" && !values["expect-head"]) ||
    (command !== "preview" && values["show-conflict"])
  ) {
    throw new Error(
      "Usage: npm run upgrade -- <preview|apply> <app-root> --to <commit> [legacy generation options]\n" +
        "Apply requires --expect-head <App HEAD from preview>.\n" +
        "To resume: npm run upgrade -- <continue|abort> <app-root>",
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

function assertAppHead(project, expected) {
  if (
    git(project, "rev-parse", "HEAD").trim() !== expected ||
    git(project, "status", "--porcelain=v1", "--untracked-files=no").trim()
  ) {
    throw new Error(
      "App HEAD changed or tracked files have local changes. Commit your work and preview again.",
    );
  }
}

function localCollisions(project, files) {
  const normalized =
    process.platform === "linux"
      ? files
      : files.map((file) => file.toLowerCase());
  return git(
    project,
    "ls-files",
    "--others",
    "--directory",
    "--no-empty-directory",
    "-z",
  )
    .split("\0")
    .filter(Boolean)
    .filter((file) => {
      const clean = file.replace(/\/$/u, "");
      const candidate =
        process.platform === "linux" ? clean : clean.toLowerCase();
      return normalized.some(
        (target) =>
          candidate === target ||
          candidate.startsWith(target + "/") ||
          target.startsWith(candidate + "/"),
      );
    });
}

function npm(repo, ...args) {
  const options = { stdio: "inherit" };
  if (process.env.npm_execpath) {
    output(
      run(repo, process.execPath, [process.env.npm_execpath, ...args], options),
    );
  } else {
    output(
      run(repo, "npm", args, {
        ...options,
        shell: process.platform === "win32",
      }),
    );
  }
}

async function workspaceLock(workspace, action) {
  const lock = workspace + ".lock";
  const pid = String(process.pid);
  try {
    await writeFile(lock, pid, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const owner = Number(await readFile(lock, "utf8"));
    if (!Number.isSafeInteger(owner) || owner <= 0) {
      throw new Error(`Incomplete upgrade lock at ${lock}; retry shortly.`);
    }
    try {
      process.kill(owner, 0);
    } catch (cause) {
      if (cause.code !== "ESRCH") throw cause;
      await rm(lock);
      await writeFile(lock, pid, { flag: "wx" });
    }
    if ((await readFile(lock, "utf8")) !== pid) {
      throw new Error("Another upgrade command is running.");
    }
  }
  try {
    await action();
  } finally {
    await rm(lock, { force: true });
  }
}

async function finish(project, workspace, state) {
  const { head, source, files } = state;
  const repo = path.join(workspace, "merge");
  assertAppHead(project, head);
  if (git(repo, "rev-parse", "HEAD").trim() !== state.mergeHead) {
    throw new Error(
      "Stage the conflict resolution with git add; leave the upgrade commit to continue.",
    );
  }
  if (git(repo, "ls-files", "-u") || git(repo, "diff", "--name-only")) {
    console.error(
      `Resolve and stage the changes in ${repo}, then run continue.`,
    );
    process.exitCode = 1;
    return;
  }
  const branch = "koi-upgrade-" + source.commit.slice(0, 12);
  const ref = "refs/heads/" + branch;
  const collision = localCollisions(project, files);
  if (collision.length)
    throw new Error(
      "Move aside occupied upgrade paths: " + collision.join(", "),
    );
  if (gitResult(project, "show-ref", "--verify", "--quiet", ref).status === 0) {
    throw new Error(
      `App branch ${branch} already exists; review that branch or rename it before retrying.`,
    );
  }
  const provenance = path.join(repo, sourceFile);
  await writeFile(provenance, JSON.stringify(source, null, 2) + "\n");
  git(repo, "add", "--force", "--", sourceFile);
  const acceptedTree = git(repo, "write-tree").trim();
  console.log(
    `Validating the upgrade in ${repo}. If validation fails, fix and stage changes there, then run continue.`,
  );
  npm(repo, "ci");
  npm(repo, "run", "validate");
  assertAppHead(project, head);
  if (
    git(repo, "write-tree").trim() !== acceptedTree ||
    git(repo, "status", "--porcelain=v1")
      .split("\n")
      .some(
        (line) => line.startsWith("??") || (line.length > 1 && line[1] !== " "),
      )
  ) {
    throw new Error(
      `Validation changed files or left untracked files in ${repo}. Review and run continue.`,
    );
  }
  const commit = commitTree(
    repo,
    acceptedTree,
    `Upgrade Koi blueprint to ${source.commit}`,
    head,
  );
  git(
    project,
    "fetch",
    "--quiet",
    "--no-tags",
    "--no-write-fetch-head",
    repo,
    commit,
  );
  git(project, "update-ref", ref, commit, "0".repeat(40));
  await rm(workspace, { recursive: true, force: true });
  console.log(
    `Validated upgrade ${commit}. Review with git diff HEAD..${branch} in the app, then merge ${branch}.`,
  );
}

async function apply(project, workspace, head, source, target) {
  assertAppHead(project, head);
  if (source.commit === target) {
    console.log("No file changes. The app is already on this blueprint.");
    return;
  }
  try {
    await mkdir(workspace);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    throw new Error("An upgrade already exists. Run continue or abort.");
  }
  let state;
  try {
    const snapshots = await prepare(workspace, project, head, source, target);
    const files = [...inspectMerge(snapshots).keys()];
    const collisions = localCollisions(project, files);
    if (collisions.length) {
      throw new Error(
        "Move aside occupied upgrade paths: " + collisions.join(", "),
      );
    }
    const { repo, local, next } = snapshots;
    git(repo, "checkout", "--quiet", "--detach", "--force", local);
    const result = gitResult(repo, "merge", "--no-ff", "--no-commit", next);
    const conflicts = git(repo, "ls-files", "-u");
    output(result, conflicts ? [0, 1] : [0]);
    const pending = {
      head,
      mergeHead: local,
      source: { ...source, commit: target },
      files,
    };
    await writeFile(
      path.join(workspace, "state.json"),
      JSON.stringify(pending),
    );
    state = pending;
    await finish(project, workspace, state);
  } finally {
    if (!state) await rm(workspace, { recursive: true, force: true });
  }
}

async function main() {
  const { command, project: projectArgument, values } = parseCommand();
  const project = await resolveProject(projectArgument);
  const staging = path.join(
    git(project, "rev-parse", "--path-format=absolute", "--git-dir").trim(),
    "koi-upgrade",
  );
  if (command === "abort") {
    await workspaceLock(staging, async () => {
      await rm(staging, { recursive: true, force: true });
      console.log(
        "Upgrade workspace removed. The original app branch and commit are intact.",
      );
    });
    return;
  }
  if (command === "continue") {
    await workspaceLock(staging, async () => {
      const state = JSON.parse(
        await readFile(path.join(staging, "state.json"), "utf8"),
      );
      await finish(project, staging, state);
    });
    return;
  }
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
  if (command === "apply") {
    if (values["expect-head"] !== head) {
      throw new Error(
        "App HEAD changed. Preview again and use the newly reported App HEAD.",
      );
    }
    await workspaceLock(staging, () =>
      apply(project, staging, head, source, target),
    );
    return;
  }
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
    const collisions = localCollisions(project, [...changes.keys()]);
    if (collisions.length) {
      console.log("Local files occupy upgrade paths: " + collisions.join(", "));
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
