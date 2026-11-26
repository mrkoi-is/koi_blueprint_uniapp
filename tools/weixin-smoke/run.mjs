import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, cp, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";
import automator from "miniprogram-automator";
import { launchWindows } from "./windows-launch.mjs";
import { replyToWelcome, reachedWelcomeCount } from "./welcome-requests.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    scenario: { type: "string", default: "home" },
    "welcome-path": { type: "string", default: "/welcome" },
  },
});
assert.ok(
  positionals.length === 1 &&
    ["home", "home-render", "typed-routes", "wot-form"].includes(
      values.scenario,
    ),
  "Usage: npm run test:smoke:mp-weixin -- <app-root> [--scenario <home-render|typed-routes|wot-form>] [--welcome-path /api/welcome]",
);
assert.match(
  values["welcome-path"],
  /^(?:\/[^/?#]+)*\/welcome$/u,
  "Expected a welcome pathname such as /welcome or /api/welcome.",
);
const app = path.resolve(positionals[0]);
const dist = path.join(app, "dist", "build", "mp-weixin");
const config = JSON.parse(
  await readFile(path.join(dist, "project.config.json"), "utf8"),
);
assert.ok(
  config.appid,
  "Configure a development AppID in src/manifest.json and rebuild.",
);
const cliPath =
  process.env.WECHAT_DEVTOOLS_CLI ??
  (process.platform === "darwin"
    ? "/Applications/wechatwebdevtools.app/Contents/MacOS/cli"
    : undefined);
assert.ok(
  cliPath && path.isAbsolute(cliPath),
  "Set WECHAT_DEVTOOLS_CLI to the absolute CLI path.",
);
await access(cliPath);
const port = process.env.WECHAT_DEVTOOLS_PORT;
assert.ok(
  port === undefined ||
    (/^[0-9]+$/u.test(port) && Number(port) > 0 && Number(port) < 65536),
  "WECHAT_DEVTOOLS_PORT must be the port displayed in the IDE.",
);
const doctor = spawnSync(
  process.execPath,
  [
    path.join(app, "scripts", "doctor.mjs"),
    "--weixin",
    ...(port ? ["--port", port] : []),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, WECHAT_DEVTOOLS_CLI: cliPath },
    timeout: 15_000,
  },
);
assert.equal(
  doctor.status,
  0,
  "Resolve the WeChat doctor checks and verify IDE login before retrying.",
);

const workspace = await mkdtemp(path.join(os.tmpdir(), "koi-weixin-smoke-"));
let mini;
let mocked = false;
const exceptions = [];
async function until(message, probe) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (exceptions.length)
      throw new Error(`Simulator exception: ${exceptions[0]}`);
    const result = await probe();
    if (result) return result;
    await delay(250);
  }
  throw new Error(message);
}

async function untilWelcomeState(message, count, probe) {
  return until(message, async () => {
    const state = await probe();
    const seen = await mini.evaluate(() => getApp().__koiWelcomeRequests);
    return reachedWelcomeCount(seen, values["welcome-path"], count) && state;
  });
}

try {
  const projectPath = path.join(workspace, "mp-weixin");
  await cp(dist, projectPath, { recursive: true, dereference: true });
  mini =
    process.platform === "win32"
      ? await launchWindows(automator, cliPath, projectPath, port)
      : await automator.launch({
          cliPath,
          projectPath,
          timeout: 45_000,
          trustProject: true,
        });
  mini.on("exception", (event) => {
    exceptions.push(
      String(event?.message ?? event?.stack ?? "application failed to start"),
    );
  });

  await until("WeChat AppService did not become ready", async () => {
    try {
      return (await mini.currentPage())?.path;
    } catch (error) {
      if (
        !String(error.message).includes(
          "timeout waiting for automator response",
        )
      )
        throw error;
      return undefined;
    }
  });

  if (values.scenario === "home") {
    await mini.evaluate(() => {
      getApp().__koiWelcomeRequests = [];
    });
    await mini.mockWxMethod("request", replyToWelcome, values["welcome-path"]);
    mocked = true;
    const page = await mini.reLaunch("/pages/home/index");
    const card = await until("Home state component did not render", () =>
      page.$("wx-home-state"),
    );
    const homeElement = (part) => card.$(`.state-card__${part}`);
    const retry = await untilWelcomeState(
      "Recoverable error and retry button did not render",
      1,
      async () => {
        const error = await homeElement("title");
        const action = await homeElement("action");
        const body = await homeElement("body");
        return (
          error &&
          body &&
          (await body.text()) === "The service is temporarily unavailable." &&
          (await error.text()) === "Something needs attention" &&
          action
        );
      },
    );
    await retry.tap();
    await untilWelcomeState(
      "Successful welcome title or body did not render after retry",
      2,
      async () => {
        const title = await homeElement("title");
        const body = await homeElement("body");
        return (
          title &&
          body &&
          (await title.text()) === "Welcome back" &&
          (await body.text()) === "The workspace is ready."
        );
      },
    );
  } else if (values.scenario === "home-render") {
    const page = await mini.reLaunch("/pages/home/index");
    await until("Production homepage did not render", async () => {
      const title = await (
        await page.$("wx-home-state")
      )?.$(".state-card__title");
      const text = title && (await title.text());
      return text && text !== "Preparing your workspace…";
    });
  } else if (values.scenario === "typed-routes") {
    const home = await mini.reLaunch("/pages/home/index");
    await (
      await until("Invoice link did not render", async () =>
        (await home.$("wx-route-actions"))?.$("#example-invoice"),
      )
    ).tap();
    await until("Invoice subpackage did not open", async () => {
      const detail = await mini.currentPage();
      return (
        detail?.path === "invoice-pages/detail/index" &&
        (await detail.$("#invoice-detail"))
      );
    });
    const returning = await mini.reLaunch("/pages/home/index");
    await (
      await until("Settings link did not render", async () =>
        (await returning.$("wx-route-actions"))?.$("#example-settings"),
      )
    ).tap();
    await until("Settings tab did not open", async () => {
      const settings = await mini.currentPage();
      return (
        settings?.path === "pages/settings/index" &&
        (await settings.$("#settings-page"))
      );
    });
  } else {
    const page = await mini.reLaunch("/invoice-pages/form/index");
    const submit = await until("Invoice form did not render", async () =>
      (await page.$("#invoice-submit"))?.$("button"),
    );
    await submit.tap();
    await until("Required field validation did not render", () =>
      page.$("#invoice-required"),
    );
    const input = await until("Invoice input did not render", async () =>
      (await page.$("wx-wd-input"))?.$("input"),
    );
    await input.input("Koi customer");
    await submit.tap();
    await until("Invoice success did not render", () =>
      page.$("#invoice-saved"),
    );
  }
} finally {
  try {
    if (mocked) await mini.restoreWxMethod("request");
  } finally {
    try {
      if (mini) await mini.close();
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }
}
console.log(`PASS mp-weixin simulator: ${values.scenario}`);
