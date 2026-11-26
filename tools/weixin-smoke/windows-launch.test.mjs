import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { launchWindows } from "./windows-launch.mjs";

test(
  "Windows launches cli.bat and connects to its automation port",
  {
    skip: process.platform !== "win32",
  },
  async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "koi wx "));
    t.after(() => rm(root, { recursive: true, force: true }));
    const bin = path.join(root, "微信 DevTools (Stable) & Tools");
    await mkdir(bin);
    const cli = path.join(bin, "cli.bat");
    const project = path.join(root, "演示 & %OS% ! project");
    await mkdir(project);
    const record = path.join(bin, "argv.json");
    await writeFile(
      path.join(bin, "record.cjs"),
      [
        'require("node:fs").writeFileSync(require("node:path").join(__dirname, "argv.json"),',
        '  JSON.stringify(process.argv.slice(2)), "utf8");',
      ].join("\n"),
    );
    // Keep the batch source ASCII even on systems with a legacy console code page.
    await writeFile(cli, '@echo off\r\nnode "%~dp0record.cjs" %*\r\n');
    const mini = {};
    let attempts = 0;
    const automator = {
      async connect({ wsEndpoint }) {
        const args = JSON.parse(await readFile(record, "utf8"));
        const port = new URL(wsEndpoint).port;
        assert.match(port, /^\d+$/u);
        assert.equal(wsEndpoint, `ws://127.0.0.1:${port}`);
        assert.deepEqual(args, [
          "auto",
          "--project",
          project,
          "--auto-port",
          port,
          "--trust-project",
          "--port",
          "38336",
        ]);
        attempts++;
        if (attempts === 1)
          throw new Error(`Failed connecting to ${wsEndpoint}`);
        return mini;
      },
    };
    assert.equal(await launchWindows(automator, cli, project, "38336"), mini);
    assert.equal(attempts, 2);
    await writeFile(cli, "@exit /b 7\r\n");
    await assert.rejects(
      launchWindows(automator, cli, project),
      (error) => error.code === 7,
    );
    assert.equal(attempts, 2);

    await writeFile(cli, "@exit /b 17\r\n");
    await assert.rejects(launchWindows(automator, cli, project), { code: 17 });
    assert.equal(attempts, 2);
  },
);
