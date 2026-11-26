import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const [example, ...extra] = process.argv.slice(2);
assert.ok(
  ["openapi", "typed-routes", "wot-form"].includes(example) &&
    extra.every((option) => option === "--h5"),
  "Usage: npm run check:example -- <sample> [--h5]",
);
const temporary = await mkdtemp(path.join(os.tmpdir(), "koi-verify-example-"));
const app = path.join(temporary, example);
const npm = process.env.npm_execpath;
assert.ok(npm, "Run through npm.");
function node(args, expected = 0, options = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: app,
    stdio: "inherit",
    ...options,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, expected, result.stderr);
  return result;
}
try {
  node([path.join(root, "scripts", "create-example.mjs"), example, app], 0, {
    cwd: root,
  });
  node([npm, "ci", "--no-audit"]);
  if (example === "openapi") {
    const types = path.join(app, "src/features/home/generated/welcome.ts");
    const previous = await readFile(types, "utf8");
    for (let index = 0; index < 2; index++) {
      node([npm, "run", "generate:api"]);
      assert.equal(await readFile(types, "utf8"), previous);
    }
    const schema = path.join(app, "contracts/welcome.openapi.json");
    const original = await readFile(schema, "utf8");
    try {
      const updated = JSON.parse(original);
      const payload =
        updated.paths["/welcome"].get.responses[200].content["application/json"]
          .schema;
      payload.properties.revision = { type: "integer" };
      payload.required.push("revision");
      await writeFile(schema, JSON.stringify(updated));
      node([npm, "run", "generate:api"]);
      assert.notEqual(await readFile(types, "utf8"), previous);
      const result = node([npm, "run", "typecheck"], 2, {
        encoding: "utf8",
        stdio: "pipe",
      });
      assert.match(result.stdout, /revision/u);
    } finally {
      await writeFile(schema, original);
      await writeFile(types, previous);
    }
  }
  if (example === "typed-routes") {
    const action = path.join(app, "src/pages/home/RouteActions.vue");
    const original = await readFile(action, "utf8");
    try {
      for (const badPath of [
        "/invoice-pages/detail/typo",
        "/pages/settings/index",
      ]) {
        await writeFile(
          action,
          original.replace("/invoice-pages/detail/index", badPath),
        );
        const result = node([npm, "run", "typecheck"], 2, {
          encoding: "utf8",
          stdio: "pipe",
        });
        assert.match(result.stdout, /not assignable/u);
      }
    } finally {
      await writeFile(action, original);
    }
    node([npm, "run", "scaffold:feature", "--", "business", "history"]);
    node([npm, "run", "generate:routes"]);
    assert.match(
      await readFile(path.join(app, "src/platform/uni/page-paths.ts"), "utf8"),
      /\/pages\/business\/history/u,
    );
  }
  for (const gate of [
    "validate:fast",
    "build:h5",
    "build:mp-weixin",
    "check:mp-budget",
    "validate",
  ]) {
    node([npm, "run", gate]);
  }
  if (extra.includes("--h5")) {
    const browserArgs = process.platform === "linux" ? ["--with-deps"] : [];
    node([
      npm,
      "exec",
      "--",
      "playwright",
      "install",
      "chromium",
      ...browserArgs,
    ]);
    node([npm, "run", "test:smoke:h5"]);
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
