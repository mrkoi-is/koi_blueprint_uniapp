import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const old = "15ca027698f06f93033eba64bfa7cecdce1bfd4b";
const target = "adff9e557340261f8594a4aa232591876558567d";

function run(cwd, command, args, expected = 0) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.ifError(result.error);
  assert.equal(
    result.status,
    expected,
    `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout.trim();
}

const git = (cwd, ...args) => run(cwd, "git", args);
const temp = await mkdtemp(path.join(os.tmpdir(), "koi-upgrade-contract-"));
const src = path.join(temp, "blueprint");
const archive = path.join(temp, "old.tar");
const values = ["--name", "invoice-demo", "--title", "Invoice Demo"];
const generator = path.join(src, "scripts/apply-skeleton.mjs");
const cli = path.join(root, "scripts/upgrade-blueprint.mjs");
const businessNote = "\n## Business invoice workflow\n";

try {
  await mkdir(src);
  git(root, "archive", "--output=" + archive, old);
  run(src, "tar", ["-xf", archive]);
  for (const aiAssets of [true, false]) {
    const app = path.join(temp, aiAssets ? "default app 中文" : "no-ai app");
    const option = aiAssets ? "--ai-assets" : "--no-ai-assets";
    run(src, process.execPath, [
      generator,
      app,
      ...values,
      ...(aiAssets ? [] : [option]),
    ]);
    git(app, "init", "-q");
    git(app, "config", "user.name", "Test");
    git(app, "config", "user.email", "test@localhost");
    run(app, process.execPath, [
      "scripts/scaffold-feature.mjs",
      "invoice",
      "detail",
    ]);
    const readme = path.join(app, "README.md");
    const original = await readFile(readme, "utf8");
    await appendFile(readme, businessNote);
    git(app, "add", ".");
    git(app, "commit", "-qm", "Initial app with invoice workflow");
    const head = git(app, "rev-parse", "HEAD");
    const args = [
      cli,
      "preview",
      app,
      "--from",
      old,
      "--to",
      target,
      ...values,
      option,
    ];
    const report = run(root, process.execPath, args);
    assert.match(report, /^A\tscripts\/doctor\.mjs$/mu);
    assert.equal(report.includes("check-mcp-config.mjs"), aiAssets);
    assert.ok(!report.includes("invoice/detail"));
    assert.equal(git(app, "rev-parse", "HEAD"), head);
    assert.equal(git(app, "status", "--porcelain"), "");
    assert.equal(await readFile(readme, "utf8"), original + businessNote);
    run(root, process.execPath, [cli, "preview", app, "--to", target], 2);

    const sharedLine = original
      .split("\n")
      .find((line) => line.includes("before AI-assisted implementation"));
    assert.ok(sharedLine, "Find upstream README text that the target edits.");
    await writeFile(
      readme,
      original.replace(sharedLine, "BUSINESS CUSTOMIZATION") + businessNote,
    );
    git(app, "commit", "-qam", "Customize README introduction");
    const conflict = run(
      root,
      process.execPath,
      [...args, "--show-conflict", "README.md"],
      1,
    );
    assert.match(conflict, /^CONFLICT\tREADME\.md$/mu);
    assert.match(conflict, /BUSINESS CUSTOMIZATION/u);
    assert.equal(git(app, "status", "--porcelain"), "");
  }
  console.log("PASS historical upgrade preview, with and without AI assets.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
