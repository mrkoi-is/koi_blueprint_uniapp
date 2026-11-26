import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  appendFile,
  copyFile,
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
const full = process.argv.includes("--full");

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
    const apply = [
      cli,
      "apply",
      app,
      "--from",
      old,
      "--to",
      target,
      ...values,
      option,
      "--expect-head",
    ];
    const report = run(root, process.execPath, args);
    assert.match(report, /^A\tscripts\/doctor\.mjs$/mu);
    assert.equal(report.includes("check-mcp-config.mjs"), aiAssets);
    assert.ok(!report.includes("invoice/detail"));
    assert.equal(git(app, "rev-parse", "HEAD"), head);
    assert.equal(git(app, "status", "--porcelain"), "");
    assert.equal(await readFile(readme, "utf8"), original + businessNote);
    run(root, process.execPath, [cli, "preview", app, "--to", target], 2);
    const looseFile = path.join(app, "scripts", "doctor.mjs");
    await writeFile(looseFile, "private local file\n");
    assert.match(
      run(root, process.execPath, [...args], 1),
      /Local files occupy upgrade paths: scripts\/doctor\.mjs/u,
    );
    run(root, process.execPath, [...apply, head], 2);
    assert.equal(await readFile(looseFile, "utf8"), "private local file\n");
    await rm(looseFile);

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
    const conflictHead = git(app, "rev-parse", "HEAD");
    run(root, process.execPath, [...apply, head], 2);
    run(root, process.execPath, [...apply, conflictHead], 1);
    const staging = path.join(
      git(app, "rev-parse", "--absolute-git-dir"),
      "koi-upgrade",
    );
    assert.match(
      git(path.join(staging, "merge"), "ls-files", "-u"),
      /README\.md/u,
    );
    run(root, process.execPath, [cli, "abort", app]);
    assert.equal(git(app, "rev-parse", "HEAD"), conflictHead);
    assert.equal(git(app, "status", "--porcelain"), "");
    await assert.rejects(readFile(path.join(staging, "state.json")), {
      code: "ENOENT",
    });

    if (full) {
      git(app, "reset", "--hard", head);
      if (aiAssets) {
        run(root, process.execPath, [...apply, conflictHead], 2);
        git(app, "reset", "--hard", conflictHead);
        run(root, process.execPath, [...apply, conflictHead], 1);
        const merge = path.join(staging, "merge");
        const targetReadme = git(
          root,
          "show",
          target + ":skeleton/README.md",
        ).replace("{{PROJECT_NAME}}", "invoice-demo");
        await writeFile(
          path.join(merge, "README.md"),
          targetReadme + "\n" + businessNote,
        );
        git(merge, "add", "--", "README.md");
        run(root, process.execPath, [cli, "continue", app]);
      } else {
        run(root, process.execPath, [...apply, head]);
      }
      const branch = "koi-upgrade-" + target.slice(0, 12);
      const before = git(app, "rev-parse", "HEAD");
      assert.equal(git(app, "rev-parse", branch + "^"), before);
      assert.match(
        git(app, "show", branch + ":README.md"),
        /Business invoice workflow/u,
      );
      assert.match(
        git(app, "show", branch + ":src/pages.json"),
        /invoice\/detail/u,
      );
      assert.match(git(app, "show", branch + ":scripts/doctor.mjs"), /Node/u);
      assert.equal(
        JSON.parse(git(app, "show", branch + ":.koi-blueprint.json")).commit,
        target,
      );
      git(app, "switch", branch);
      assert.match(
        run(root, process.execPath, [cli, "preview", app, "--to", target]),
        /No file changes/u,
      );
      git(app, "revert", "--no-edit", "HEAD");
      assert.equal(
        git(app, "rev-parse", "HEAD^{tree}"),
        git(app, "rev-parse", before + "^{tree}"),
      );
    }
  }
  console.log("PASS historical upgrade preview, with and without AI assets.");

  const fixture = path.join(temp, "deletion-blueprint");
  git(root, "clone", "-q", "--shared", "--no-checkout", root, fixture);
  git(fixture, "checkout", "-q", "--detach", target);
  git(fixture, "config", "user.name", "Test");
  git(fixture, "config", "user.email", "test@localhost");
  const modified = path.join(temp, "modified app");
  run(fixture, process.execPath, [
    "scripts/apply-skeleton.mjs",
    modified,
    ...values,
    "--no-ai-assets",
  ]);
  git(modified, "init", "-q");
  git(modified, "config", "user.name", "Test");
  git(modified, "config", "user.email", "test@localhost");
  await appendFile(
    path.join(modified, "scripts/doctor.mjs"),
    "\n// Local developer checks.\n",
  );
  git(modified, "add", ".");
  git(modified, "commit", "-qm", "Keep customized doctor");
  git(fixture, "rm", "skeleton/scripts/doctor.mjs");
  git(fixture, "commit", "-qm", "Remove doctor in target");
  for (const file of ["upgrade-blueprint.mjs", "blueprint-source.mjs"]) {
    await copyFile(
      path.join(root, "scripts", file),
      path.join(fixture, "scripts", file),
    );
  }
  const removed = run(
    fixture,
    process.execPath,
    [
      "scripts/upgrade-blueprint.mjs",
      "preview",
      modified,
      "--from",
      target,
      "--to",
      git(fixture, "rev-parse", "HEAD"),
      ...values,
      "--no-ai-assets",
      "--show-conflict",
      "scripts/doctor.mjs",
    ],
    1,
  );
  assert.match(removed, /CONFLICT\tscripts\/doctor\.mjs/u);
  assert.match(removed, /--- new blueprint\r?\n\(absent\)/u);
  assert.equal(git(modified, "status", "--porcelain"), "");
  console.log("PASS upstream deletion conflicts with an app modification.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
