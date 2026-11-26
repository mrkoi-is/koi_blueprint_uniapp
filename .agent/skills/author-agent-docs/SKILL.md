---
name: author-agent-docs
description: Write or revise a project spec, implementation brief, acceptance handoff, or reusable coding-agent Skill. Use for 写 Spec、实施任务书、验收交接或编写项目 Skill.
---

# 编写项目 Spec、交接说明与 Skill

先确定读者拿到文档后要做什么。需求方要判断目标，实施者要找到修改入口，验收者要能复现结果。按请求选择下面对应的写法，沿用读者的语言。

## 需求规格与实施任务书

从现有 `specs/` 找到同一行为的 Spec。新需求使用 `specs/000-template.md`，保留适用的小节。写清目标用户、可观察结果、范围和目标端。标明 Stable 或已明确选定的 Profile。把尚待决定且会改变行为的假设留在 Spec 中。

每个验收场景给出可设置的初始条件、一次操作和可观察的结果。为失败场景写出用户如何恢复。在实施任务书中，补充当前入口、相关契约、可以独立验证的第一个改动，以及验证它的命令和执行目录。

以生成项目的首页为例，要写“加载失败后允许重试”，可从 `src/pages/home/index.vue` 的 `@retry` 绑定和 `src/features/home/use-home.ts` 的 `LoadHome.execute()` 确认现有流程。验收者可以执行下面的场景。

> 在 H5 和微信小程序分别打开首页。让测试用的欢迎信息仓储第一次返回错误、第二次返回欢迎信息。看到错误后点击一次 “Try again”，页面应显示第二次返回的标题和正文。

## 实施与验收交接

先给出结果和所选 Profile，再为每项结论附上对应的代码位置、实际运行的命令或观察记录。测试失败时写下失败条件和错误摘要。仍待验证的场景应带上下一位执行者需要的环境、操作与预期现象。可以直接交接在回复或原 Spec 的验证小节中。

上述场景的 `tests/unit/load-home.test.ts` 覆盖仓储成功与失败时用例的返回值。可在生成项目根目录运行这个测试，记录本次结果。

```bash
npm test -- tests/unit/load-home.test.ts
```

按钮点击及随后的页面渲染需要端上观测或覆盖该交互的测试。若尚未运行，可在交接中写下具体操作。

> 待验证微信端重试。使用先失败再成功的测试仓储，在开发者工具点击 “Try again”，核对返回的标题和正文。

若结果依赖 MCP 检索，附上返回内容所指向的文档、版本和适用平台，方便下一位核对。

## 新增或更新项目 Skill

1. 找到 `.agent/skills/index.yaml` 中最接近的工作流。已有 Skill 能覆盖同一请求时直接更新它。独立的重复任务可以新增 Skill。
2. 在 `.agent/skills/<id>/SKILL.md` 写唯一正文。YAML 文件头的 `name` 应等于目录名，长度为 1–64 个字符，使用小写字母和数字，词间可用单个连字符。`description` 用 1–1024 个字符说明“能做什么、何时选用”。正文写所需输入、项目特有步骤、可交付结果和检验方式。复杂参考资料可放同目录的 `references/` 并按需链接。[Agent Skills 格式规范](https://agentskills.io/specification)
3. 在索引的 `routing` 登记中英文触发短语，在 `skills` 登记相同 ID、正文路径和用途。在生成项目根目录运行以下命令，刷新并检查 `.agents/skills/` 和 `.claude/skills/` 的发现入口。

   ```bash
   node scripts/sync-agent-skills.mjs
   node scripts/sync-agent-skills.mjs --check
   ```

4. 用一条真实请求从 `AGENTS.md` 和索引走一遍，打开匹配的文件，核对其中的路径与命令。再用相近请求检查误触发。例如“写一份首页失败重试的验收交接”应选本 Skill，“给首页新增失败重试的业务流程”应选 `add-feature`。在支持原生 Skill 发现的客户端，重新载入项目并检查新增的名称与描述。
