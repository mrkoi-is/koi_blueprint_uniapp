import { spawnSync } from "node:child_process";
import { constants } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const windows = process.platform === "win32";
const usage = "npm run doctor -- [--weixin] [--port <微信开发者工具服务端口>]";
const { values } = parseArgs({
  options: {
    help: { type: "boolean", short: "h" },
    weixin: { type: "boolean" },
    port: { type: "string" },
  },
});

function report(status, message) {
  console.log(`[${status}] ${message}`);
  if (status === "FAIL") process.exitCode = 1;
}

async function isFile(file, mode = constants.F_OK) {
  try {
    await access(file, mode);
    return (await stat(file)).isFile();
  } catch (error) {
    if (["ENOENT", "ENOTDIR", "EACCES", "EPERM"].includes(error.code))
      return false;
    throw error;
  }
}

function devtoolsCandidates() {
  if (process.env.WECHAT_DEVTOOLS_CLI)
    return [path.resolve(process.env.WECHAT_DEVTOOLS_CLI)];
  if (process.platform === "darwin") {
    return ["/Applications", path.join(homedir(), "Applications")].map((base) =>
      path.join(base, "wechatwebdevtools.app/Contents/MacOS/cli"),
    );
  }
  if (windows) {
    const locations = [
      process.env.ProgramFiles,
      process.env["ProgramFiles(x86)"],
    ].filter(Boolean);
    return locations.flatMap((base) =>
      ["微信web开发者工具", "微信开发者工具"].map((name) =>
        path.join(base, "Tencent", name, "cli.bat"),
      ),
    );
  }
  return [];
}

async function checkEnvironment() {
  const pkg = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  const [major, minor] = process.versions.node.split(".").map(Number);
  // The template declares an inclusive major.minor floor and an exclusive major ceiling.
  const range = /^>=(\d+)\.(\d+) <(\d+)$/u.exec(pkg.engines.node);
  const supported =
    range &&
    (major > Number(range[1]) ||
      (major === Number(range[1]) && minor >= Number(range[2]))) &&
    major < Number(range[3]) &&
    !process.versions.node.includes("-");
  report(
    supported ? "OK" : "FAIL",
    `Node ${process.version}，项目要求 ${pkg.engines.node}。如需切换，请使用项目的 .nvmrc。`,
  );

  const npm = windows
    ? spawnSync("cmd.exe", ["/d", "/c", "npm.cmd --version"], {
        encoding: "utf8",
        timeout: 5000,
      })
    : spawnSync("npm", ["--version"], { encoding: "utf8", timeout: 5000 });
  if (npm.status === 0 && /^\d+\.\d+\.\d+$/u.test(npm.stdout.trim())) {
    const actual = `npm@${npm.stdout.trim()}`;
    report(
      actual === pkg.packageManager ? "OK" : "WARN",
      `${actual}，模板使用 ${pkg.packageManager}。`,
    );
  } else {
    report(
      "FAIL",
      `无法运行 npm --version。请把随 Node 安装的 npm 加入 PATH（模板使用 ${pkg.packageManager}）。`,
    );
  }

  const executable = windows ? constants.F_OK : constants.X_OK;
  const uni = path.join(root, "node_modules/.bin", windows ? "uni.cmd" : "uni");
  if (await isFile(uni, executable)) {
    report("OK", "已找到项目本地的 uni-app CLI。");
  } else {
    report(
      "FAIL",
      "未找到可运行的项目本地 uni-app CLI。请在应用根目录运行 npm ci。",
    );
  }

  const lock = JSON.parse(
    await readFile(path.join(root, "package-lock.json"), "utf8"),
  );
  for (const name of [
    "@dcloudio/vite-plugin-uni",
    "@dcloudio/uni-h5",
    "@dcloudio/uni-mp-weixin",
  ]) {
    const location = `node_modules/${name}`;
    const manifest = path.join(root, location, "package.json");
    const expected = lock.packages?.[location]?.version;
    let installed;
    try {
      installed = JSON.parse(await readFile(manifest, "utf8")).version;
    } catch (error) {
      if (error.code === "ENOENT") installed = "缺失";
      else if (error instanceof SyntaxError) installed = "包清单损坏";
      else throw error;
    }
    if (expected && installed === expected) {
      report("OK", `${name}@${installed}`);
    } else {
      report(
        "FAIL",
        `${name} 预期 ${expected ?? "锁文件中的版本"}，实际 ${installed ?? "缺失"}。请运行 npm ci 恢复项目依赖。`,
      );
    }
  }

  let cli;
  for (const candidate of devtoolsCandidates()) {
    if (await isFile(candidate, executable)) {
      cli = candidate;
      break;
    }
  }
  if (cli) {
    report("OK", `微信开发者工具 CLI 文件：${cli}`);
  } else {
    report(
      values.weixin || values.port !== undefined ? "FAIL" : "WARN",
      "未找到可用的微信开发者工具 CLI。安装桌面客户端或将 WECHAT_DEVTOOLS_CLI 设为 cli（Windows 为 cli.bat）的完整路径。",
    );
  }

  for (const mode of ["dev", "build"]) {
    const target = path.join("dist", mode, "mp-weixin");
    const config = path.join(root, target);
    const present =
      (await isFile(path.join(config, "app.json"))) &&
      (await isFile(path.join(config, "project.config.json")));
    report(
      present ? "OK" : "INFO",
      present
        ? `已找到小程序导入文件：${target}`
        : `待生成 ${target}。在应用目录运行 npm run ${mode}:mp-weixin。`,
    );
  }
}

async function checkLogin(port) {
  const address = `http://127.0.0.1:${port}/v2/islogin`;
  try {
    const response = await fetch(address, {
      redirect: "manual",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      report(
        "FAIL",
        `本机端口 ${port} 返回 HTTP ${response.status}，请核对客户端的服务端口与访问设置；登录状态待确认。`,
      );
      return;
    }
    const result = await response.json();
    if (typeof result?.login !== "boolean") {
      report(
        "FAIL",
        "服务未返回布尔型 login 字段。请核对开发者工具的服务端口；登录状态待确认。",
      );
      return;
    }
    report("OK", `微信开发者工具服务端口 ${port} 已响应。`);
    report(
      result.login ? "OK" : "FAIL",
      result.login
        ? "微信开发者工具已登录。"
        : "微信开发者工具尚未登录。请在桌面客户端登录后重试。",
    );
  } catch (error) {
    report(
      "FAIL",
      `无法读取本机 ${port} 的登录状态（${error.name}）。请打开微信开发者工具，在设置 → 安全中核对服务端口。`,
    );
  }
}

if (values.help) {
  console.log(usage);
  console.log(
    "--weixin 要求找到开发者工具 CLI。--port 只读查询指定本机服务端口的登录状态。",
  );
} else if (
  values.port !== undefined &&
  (!/^\d{1,5}$/u.test(values.port) ||
    Number(values.port) < 1 ||
    Number(values.port) > 65535)
) {
  console.error("请输入 1–65535 之间的本机服务端口。");
  process.exitCode = 2;
} else {
  await checkEnvironment();
  if (values.port !== undefined) {
    await checkLogin(Number(values.port));
  } else {
    report(
      "INFO",
      "服务端口与登录状态尚未探测。需要时用 npm run doctor -- --weixin --port <端口号>。",
    );
  }
}
