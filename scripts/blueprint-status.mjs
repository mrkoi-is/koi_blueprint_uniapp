import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  blueprintRepository,
  commitPattern,
  sourceFile,
} from "./blueprint-source.mjs";

const remote = blueprintRepository + ".git";

function git(cwd, ...args) {
  return spawnSync("git", ["--no-optional-locks", ...args], {
    cwd,
    encoding: "utf8",
    timeout: 45_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

function newestStable(output) {
  const tags = [];
  const peeled = new Map();
  for (const line of output.split(/\r?\n/u)) {
    const [sha, ref] = line.split("\t");
    if (!commitPattern.test(sha)) continue;
    const match =
      /^refs\/tags\/(v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*))(\^\{\})?$/u.exec(
        ref,
      );
    if (!match) continue;
    if (match[5]) peeled.set(match[1], sha);
    else
      tags.push({ tag: match[1], sha, version: match.slice(2, 5).map(BigInt) });
  }
  tags.sort((left, right) => {
    const index = left.version.findIndex(
      (part, i) => part !== right.version[i],
    );
    return index < 0 ? 0 : left.version[index] > right.version[index] ? -1 : 1;
  });
  if (tags.length === 0) return null;
  const { tag, sha } = tags[0];
  return { tag, sha: peeled.get(tag) ?? sha };
}

function hasCommit(repository, sha) {
  return git(repository, "cat-file", "-t", sha).stdout?.trim() === "commit";
}

export async function getBlueprintStatus(blueprint, app) {
  let source;
  try {
    source = JSON.parse(git(app, "show", `HEAD:${sourceFile}`).stdout);
  } catch {
    return { status: "source-unknown", current: null, target: null };
  }
  if (
    source?.schemaVersion !== 1 ||
    source.repository !== blueprintRepository ||
    source.profile !== "stable" ||
    !commitPattern.test(source.commit) ||
    typeof source.name !== "string" ||
    typeof source.title !== "string" ||
    typeof source.aiAssets !== "boolean"
  ) {
    return { status: "source-unknown", current: null, target: null };
  }
  try {
    const manifest = JSON.parse(
      git(app, "show", "HEAD:src/manifest.json").stdout,
    );
    if (manifest["mp-weixin"]?.agent !== undefined) {
      return { status: "source-unknown", current: null, target: null };
    }
  } catch {
    return { status: "source-unknown", current: null, target: null };
  }
  const current = source.commit;
  const refs = git(blueprint, "ls-remote", "--tags", remote);
  if (refs.status !== 0)
    return { status: "remote-unreachable", current, target: null };
  const target = newestStable(refs.stdout);
  if (!target) return { status: "no-release", current, target };

  let repository = blueprint;
  let temporary;
  const unresolved = { status: "history-unavailable", current, target };
  try {
    if (
      !hasCommit(repository, current) ||
      !hasCommit(repository, target.sha) ||
      git(repository, "rev-parse", "--is-shallow-repository").stdout?.trim() !==
        "false"
    ) {
      temporary = await mkdtemp(path.join(os.tmpdir(), "koi-release-history-"));
      repository = path.join(temporary, "history.git");
      const clone = git(
        temporary,
        "clone",
        "--bare",
        "--shared",
        "--no-tags",
        blueprint,
        repository,
      );
      if (clone.status !== 0) return unresolved;
      const shallow =
        git(
          repository,
          "rev-parse",
          "--is-shallow-repository",
        ).stdout?.trim() === "true";
      const flags = shallow ? ["--unshallow"] : [];
      const fetch = git(
        repository,
        "fetch",
        "--no-tags",
        ...flags,
        remote,
        "+refs/heads/*:refs/remotes/stable/*",
        `refs/tags/${target.tag}`,
      );
      if (
        fetch.status !== 0 ||
        !hasCommit(repository, current) ||
        !hasCommit(repository, target.sha)
      )
        return unresolved;
    }
    if (current === target.sha) return { status: "current", current, target };
    const behind = git(
      repository,
      "merge-base",
      "--is-ancestor",
      current,
      target.sha,
    ).status;
    const ahead = git(
      repository,
      "merge-base",
      "--is-ancestor",
      target.sha,
      current,
    ).status;
    if (![0, 1].includes(behind) || ![0, 1].includes(ahead)) return unresolved;
    const status =
      behind === 0 ? "update-available" : ahead === 0 ? "ahead" : "diverged";
    return { status, current, target };
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true });
  }
}
