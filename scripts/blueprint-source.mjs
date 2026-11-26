import { execFileSync } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

export const sourceFile = ".koi-blueprint.json";
export const blueprintRepository =
  "https://github.com/mrkoi-is/koi_blueprint_uniapp";
export const commitPattern = /^[a-f0-9]{40}$/u;

export async function sourceCommit(root, sourcePaths) {
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  let checkout;
  try {
    checkout = git("rev-parse", "--show-toplevel").trim();
  } catch {
    // Archives can be used without Git installed.
  }
  if (
    !checkout ||
    path.relative(await realpath(root), await realpath(checkout))
  ) {
    let exported;
    try {
      exported = (
        await readFile(path.join(root, ".koi-blueprint-source"), "utf8")
      ).trim();
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
    return commitPattern.test(exported) ? exported : null;
  }
  try {
    const commit = git("rev-parse", "HEAD").trim();
    const inputs = [
      "skeleton",
      ".agent/skills",
      ".agents/skills",
      "scripts",
      "package.json",
      ".gitattributes",
      ...sourcePaths,
    ];
    const changes = git(
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "-z",
      "--",
      ...inputs,
    );
    const tracked = new Set(git("ls-files", "-z").split("\0"));
    return commitPattern.test(commit) &&
      !changes &&
      sourcePaths.every((file) => tracked.has(file))
      ? commit
      : null;
  } catch {
    return null;
  }
}
