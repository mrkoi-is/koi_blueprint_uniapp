import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = process.argv[2] && path.resolve(process.argv[2]);
const model = process.argv[3];
if (!output || !model) {
  throw new Error(
    "Usage: node scripts/evaluate-agent-writing.mjs <empty-output-dir> <Codex model ID>",
  );
}
await mkdir(output, { recursive: true });
if ((await readdir(output)).length) {
  throw new Error("The evaluation output directory must be empty.");
}
const attachment = ".agent/skills/author-agent-docs/SKILL.md";
const old = spawnSync("git", ["show", `5ec852e:${attachment}`], {
  cwd: root,
  encoding: "utf8",
});
if (old.status !== 0)
  throw new Error("The baseline writing Skill at 5ec852e is unavailable.");
const tasks = JSON.parse(
  await readFile(
    path.join(root, "docs/research/agent-writing-eval/tasks.json"),
    "utf8",
  ),
);
const variants = {
  baseline: old.stdout,
  candidate: await readFile(path.join(root, attachment), "utf8"),
};
const answers = [];

for (const task of tasks) {
  const evidence = await Promise.all(
    task.files.map(async (file) => {
      return `# ${file}\n${await readFile(path.join(root, file), "utf8")}`;
    }),
  );
  for (const [name, skill] of Object.entries(variants)) {
    console.log(`Run ${task.id} (${name})`);
    const workspace = await mkdtemp(
      path.join(os.tmpdir(), "koi-writing-task-"),
    );
    try {
      const result = spawnSync(
        "codex",
        [
          "exec",
          "--skip-git-repo-check",
          "--sandbox",
          "read-only",
          "--ephemeral",
          "-m",
          model,
          "-c",
          'model_reasoning_effort="low"',
          "-",
        ],
        {
          cwd: workspace,
          encoding: "utf8",
          timeout: 90_000,
          input: `你是 uni-app 仓库的技术作者。只用下面给定的仓库证据和 Skill 作答，直接输出中文 Markdown，最多 400 字。\n\n项目 Skill\n${skill}\n\n仓库证据\n${evidence.join("\n")}\n\n任务\n${task.prompt}\n`,
        },
      );
      if (result.status !== 0) {
        throw new Error(
          `Codex evaluation failed for ${task.id}/${name}. Check the CLI sign-in, model ID and network.`,
        );
      }
      answers.push({ file: `${task.id}-${name}.md`, text: result.stdout });
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }
}
for (const { file, text } of answers) {
  await writeFile(path.join(output, file), text, { flag: "wx" });
}
