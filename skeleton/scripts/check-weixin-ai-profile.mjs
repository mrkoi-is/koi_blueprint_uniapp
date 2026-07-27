import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const manifest = JSON.parse(
  await readFile(path.join(sourceRoot, "manifest.json"), "utf8"),
);
const packageJson = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8"),
);
const agent = manifest["mp-weixin"]?.agent;
const errors = [];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveProfilePath(relativePath, label) {
  if (
    typeof relativePath !== "string" ||
    relativePath.length === 0 ||
    path.isAbsolute(relativePath)
  ) {
    errors.push(`${label} must be a non-empty path relative to src/.`);
    return undefined;
  }

  const resolved = path.resolve(sourceRoot, relativePath);
  const relative = path.relative(sourceRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    errors.push(`${label} must stay inside src/.`);
    return undefined;
  }
  return resolved;
}

async function requireFile(relativePath, label, parseJson = false) {
  const resolved = resolveProfilePath(relativePath, label);
  if (resolved === undefined) {
    return;
  }
  if (!(await exists(resolved)) || !(await stat(resolved)).isFile()) {
    errors.push(`${label} does not exist: src/${relativePath}`);
    return;
  }
  if (parseJson) {
    try {
      JSON.parse(await readFile(resolved, "utf8"));
    } catch (cause) {
      errors.push(`${label} must be valid JSON (${cause}).`);
    }
  }
}

if (agent === undefined) {
  console.log("PASS Weixin AI runtime profile is inactive (stable default).");
} else if (typeof agent !== "object" || agent === null) {
  errors.push("mp-weixin.agent must be an object when the profile is active.");
} else {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const dcloudVersions = Object.entries(dependencies)
    .filter(
      ([name]) => name.startsWith("@dcloudio/") && name !== "@dcloudio/types",
    )
    .map(([, version]) => version);

  if (
    dcloudVersions.length === 0 ||
    dcloudVersions.some(
      (version) => typeof version !== "string" || !version.includes("-alpha-"),
    )
  ) {
    errors.push(
      "The Weixin AI runtime profile requires a complete DCloud Alpha cohort selected with uvm.",
    );
  }

  const appId = manifest["mp-weixin"]?.appid;
  if (
    typeof appId !== "string" ||
    appId.trim().length === 0 ||
    /^(?:touristappid|replace-)/u.test(appId)
  ) {
    errors.push(
      "mp-weixin.appid must be a real App ID when AI mode is active.",
    );
  }

  await requireFile(agent.instruction, "mp-weixin.agent.instruction");
  await requireFile(agent.pageMetadata, "mp-weixin.agent.pageMetadata", true);

  if (!Array.isArray(agent.skills) || agent.skills.length === 0) {
    errors.push("mp-weixin.agent.skills must contain at least one Skill.");
  } else {
    const seenSkillNames = new Set();
    const seenSkillPaths = new Set();

    for (const [index, skill] of agent.skills.entries()) {
      const label = `mp-weixin.agent.skills[${String(index)}]`;
      if (
        typeof skill?.name !== "string" ||
        skill.name.trim().length === 0 ||
        typeof skill?.description !== "string" ||
        skill.description.trim().length === 0
      ) {
        errors.push(`${label} requires a name and description.`);
      } else if (seenSkillNames.has(skill.name)) {
        errors.push(`${label}.name duplicates "${skill.name}".`);
      } else {
        seenSkillNames.add(skill.name);
      }

      const skillRoot = resolveProfilePath(skill?.path, `${label}.path`);
      if (
        skillRoot === undefined ||
        !(await exists(skillRoot)) ||
        !(await stat(skillRoot)).isDirectory()
      ) {
        errors.push(`${label}.path must point to a directory inside src/.`);
        continue;
      }

      if (seenSkillPaths.has(skillRoot)) {
        errors.push(`${label}.path duplicates another Skill directory.`);
      } else {
        seenSkillPaths.add(skillRoot);
      }

      for (const requiredName of ["SKILL.md", "mcp.json", "index.js"]) {
        const requiredPath = path.join(skillRoot, requiredName);
        const requiredRelativePath = path
          .relative(sourceRoot, requiredPath)
          .split(path.sep)
          .join("/");
        await requireFile(
          requiredRelativePath,
          `${label}.path/${requiredName}`,
          requiredName === "mcp.json",
        );
      }
    }
  }

  if (errors.length === 0) {
    console.log(
      `PASS Weixin AI runtime profile (${String(agent.skills.length)} Skills).`,
    );
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  process.exitCode = 1;
}
