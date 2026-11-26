import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { blueprintRepository } from "./blueprint-source.mjs";

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "scripts", "upgrade-blueprint.mjs");
const temporary = await mkdtemp(path.join(os.tmpdir(), "koi-stable-status-"));
const remote = path.join(temporary, "remote");
const app = path.join(temporary, "invoice project");
const env = {
  ...process.env,
  GIT_CONFIG_COUNT: "1",
  GIT_CONFIG_KEY_0: `url.${remote}.insteadOf`,
  GIT_CONFIG_VALUE_0: blueprintRepository + ".git",
  GIT_AUTHOR_NAME: "Koi Example",
  GIT_AUTHOR_EMAIL: "example@invalid.test",
  GIT_COMMITTER_NAME: "Koi Example",
  GIT_COMMITTER_EMAIL: "example@invalid.test",
};
function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function verify(status, target, exit = 0, configuration = env) {
  const snapshot = [
    "rev-parse HEAD",
    "write-tree",
    "status --porcelain=v1 --untracked-files=all",
  ].map((command) => git(app, ...command.split(" ")));
  const result = spawnSync(process.execPath, [cli, "status", app, "--json"], {
    cwd: root,
    env: configuration,
    encoding: "utf8",
  });
  assert.equal(result.status, exit, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, status);
  assert.deepEqual(report.target, target);
  assert.deepEqual(
    [
      "rev-parse HEAD",
      "write-tree",
      "status --porcelain=v1 --untracked-files=all",
    ].map((command) => git(app, ...command.split(" "))),
    snapshot,
  );
}
async function record(commit) {
  await writeFile(
    path.join(app, ".koi-blueprint.json"),
    JSON.stringify({
      schemaVersion: 1,
      repository: blueprintRepository,
      profile: "stable",
      name: "invoice",
      title: "Invoice",
      aiAssets: false,
      commit,
    }),
  );
  git(app, "add", ".koi-blueprint.json");
  git(app, "commit", "--allow-empty", "-qm", "Record baseline");
}
try {
  for (const directory of [remote, app]) {
    await mkdir(directory);
    git(directory, "init", "-q", "-b", "main");
  }
  const emptyCommit = (message) =>
    git(
      remote,
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--allow-empty",
      "-qm",
      message,
    );
  emptyCommit("base");
  const base = git(remote, "rev-parse", "HEAD");
  emptyCommit("release");
  const release = git(remote, "rev-parse", "HEAD");
  emptyCommit("ahead");
  const ahead = git(remote, "rev-parse", "HEAD");
  git(remote, "switch", "-q", "-c", "topic", base);
  emptyCommit("topic");
  const diverged = git(remote, "rev-parse", "HEAD");
  git(remote, "switch", "-q", "main");
  await mkdir(path.join(app, "src"));
  await writeFile(path.join(app, "src", "manifest.json"), '{"mp-weixin":{}}');
  git(app, "add", "src");
  git(app, "commit", "-qm", "Initialize app");
  verify("source-unknown", null, 2);
  await record(base);
  verify("no-release", null);
  git(remote, "tag", "v1.9.0", base);
  verify("current", { tag: "v1.9.0", sha: base });
  git(
    remote,
    "-c",
    "tag.gpgsign=false",
    "tag",
    "-am",
    "Stable release",
    "v1.10.0",
    release,
  );
  git(remote, "tag", "v2.0.0-rc.1", ahead);
  const target = { tag: "v1.10.0", sha: release };
  // An uncommitted provenance edit must be ignored.
  await writeFile(path.join(app, ".koi-blueprint.json"), "{}");
  verify("update-available", target);
  await record(release);
  verify("current", target);
  await record(ahead);
  verify("ahead", target);
  await record(diverged);
  verify("diverged", target);
  await record("a".repeat(40));
  verify("history-unavailable", target, 2);
  verify("remote-unreachable", null, 2, {
    ...env,
    GIT_CONFIG_KEY_0: `url.${path.join(temporary, "missing")}.insteadOf`,
  });
  console.log(
    "PASS read-only Stable status against local Git release fixtures.",
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
