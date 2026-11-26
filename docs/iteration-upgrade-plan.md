# Koi uni-app 蓝图迭代升级方案

**建议下一轮先交付两件事：让新生成的项目记住自己来自哪次蓝图提交，让已有项目在改动任何文件之前看清升级差异。** 本仓库已经能生成并验证一个新应用。现在值得补的是另一条路径：业务团队改过页面、依赖或 Agent 配置以后，仍能单独接收蓝图的修复。第一批可交付的更新就用仓库里真实发生过的三项变更：Agent 写作和 MCP、本地开发检测、Windows Skill 同步修复。

研究核对日期为 2026-11-26，基线为公开 `main` 的 `adff9e5`。以下里程碑属于提案。实验采用 Stable、H5 和微信小程序。

## 当前项目能做到哪里

| 已核实的事实 | 对迭代顺序的影响 |
| --- | --- |
| 生成器按名称、标题和 AI 资产开关组装项目。部分 npm scripts 和 Skill 入口是在生成时写出来的。生成结果没有记录蓝图提交及当时的参数。 | 升级比较的双方应是各版本真实生成的应用。只比较两个 `skeleton/` 会漏掉 MCP 和 Skill 入口。[生成器](../scripts/apply-skeleton.mjs) |
| 本地有 `v0.1.0`，对应 `15ca027`。GitHub 的 tags 和 releases 列表在核对时均为空，`main` 比这个本地标签多 3 次提交。根包和模板应用的 `version` 都还是 `0.1.0`。 | 当下用完整 Git SHA 定位。下次发布时补齐变更日志、远端标签及适用范围。业务应用继续管理自己的版本。[变更日志](../CHANGELOG.md) · [GitHub 标签](https://github.com/mrkoi-is/koi_blueprint_uniapp/tags) |
| 当前 `main` 的 Windows、Ubuntu 生成器合同和全新生成应用验证全部通过。生成项目自己的 CI 执行 `npm run validate`，其中尚未包含 MCP 配置和 Skill 发现入口的离线检查。 | 复用蓝图的跨系统任务，补一组“旧项目升级”样例，再让启用 AI 资产的业务项目也能在日常 CI 中发现漂移。[已完成的 CI](https://github.com/mrkoi-is/koi_blueprint_uniapp/actions/runs/45769789985) · [生成项目 CI](../skeleton/.github/workflows/ci.yml) · [应用脚本](../skeleton/package.json) |

## 用两次真实生成验证升级方式

在临时目录分别展开 `15ca027698f06f93033eba64bfa7cecdce1bfd4b` 和 `adff9e557340261f8594a4aa232591876558567d`，各自运行该版本的生成器。两端都显式指定 `--name upgrade-demo --title "Upgrade Demo"`。下表统计生成文件，排除依赖和构建产物。

| Stable 生成方式 | 旧版 → 新版 | 新增 | 修改 |
| --- | ---: | ---: | ---: |
| 默认，含 Agent 资产 | 96 → 127 | 31 | 13 |
| `--no-ai-assets` | 53 → 55 | 2 | 3 |

关闭 AI 资产后，新增的两个文件是 `LOCAL_DEVELOPMENT.md` 和 `scripts/doctor.mjs`。同一新版、同一组参数连续生成两次，得到相同的 Git 文件树。这给升级工具提供了一个可复现的对照组。[旧版生成器](https://github.com/mrkoi-is/koi_blueprint_uniapp/blob/15ca027698f06f93033eba64bfa7cecdce1bfd4b/scripts/apply-skeleton.mjs) · [新版生成器](https://github.com/mrkoi-is/koi_blueprint_uniapp/blob/adff9e557340261f8594a4aa232591876558567d/scripts/apply-skeleton.mjs)

| 模拟业务团队的改动 | 实测结果 |
| --- | --- |
| 新增 `src/features/invoice/model.ts`，并在 README 末尾加入业务说明 | 两种模式均可三方合并。业务文件、README 说明和新版 doctor 同时保留。用新版 `--force` 直接覆盖的对照实验中，README 业务说明丢失。 |
| 业务方修改 README 中恰好被新版删除的同一行 | 两种模式均只报告 `README.md` 冲突。只读预览退出码为 1，业务工作树保持干净。临时分支实际合并保留了三个版本，`git merge --abort` 恢复到原业务提交。 |

另在旧版默认项目用自带脚手架生成 `invoice/detail` 业务页、路由和单测，追加 README 业务说明后再升级。合并后的项目保留了业务页面与上游 doctor，`npm ci` 和 `npm run validate` 均通过。32 项单测通过，H5 与微信小程序均构建成功，微信主包为 82.3 KiB，验证后 Git 工作树干净。

实验环境为 macOS、Node 22.18.0、npm 10.9.3、Git 2.54.0。Windows 上已有的 CI 证据覆盖生成器；升级合并本身的 Windows 验证列入下一轮。真实业务仓库仍需试点，以上样例不足以估计其冲突率。

## 开源做法如何用于 Koi

| 参考实现 | 可借用的做法 | 在 Koi 的取舍 |
| --- | --- | --- |
| Copier | 用初次生成时的答案重建旧模板，分离业务修改，再迁移到新版；明确处理删除和冲突。 | 保留现有 Node 渲染器，复用“旧模板产物、当前项目、新模板产物”三个输入。切换模板引擎需要重新验证现有参数、分发清单和跨系统合同。[Copier 更新流程](https://copier.readthedocs.io/en/stable/updating/#how-the-update-works) |
| Cruft | 保存模板 Git SHA 和生成参数，允许已有 Cookiecutter 项目关联历史提交，先审阅更新。 | 新项目自动记录来源。老项目从首个生成提交或原始生成记录恢复基线；来源不明时提供人工对照。这个区分可以防止跳过尚未接收的修复。[Cruft 创建与更新](https://cruft.github.io/cruft/#creating-a-new-project) · [老项目接入](https://cruft.github.io/cruft/#linking-an-existing-project) |
| Git | 现代 `merge-tree --write-tree` 可以在临时仓库按共同祖先试合并整棵树，处理文本、重命名及文件与目录冲突。 | 预览和实际应用共用合并语义。把旧产物设为共同祖先，业务树和新产物作为两个子提交，业务仓库可以拥有独立的 Git 历史。[Git 合并树文档](https://git-scm.com/docs/git-merge-tree) |
| DCloud、create-uni | DCloud 的 `uvm` 负责主要编译依赖，新增 scripts 需要另行对照。create-uni 在配置组合上实际生成应用再构建。 | 编译器版本组做独立变更；蓝图升级样例同时覆盖默认版和无 AI 版，并从升级产物构建。[DCloud CLI 说明](https://uniapp.dcloud.net.cn/quickstart-cli.html#更新依赖到指定版本) · [create-uni CI 源码](https://github.com/uni-helper/create-uni/blob/db85c2b59f8ada6e0b0ee91ae34e5d679fb60a46/.github/workflows/core_test.yml#L84-L114) |

## 实施顺序和验收

工期为一名熟悉生成器的维护者的粗估，按可独立评审的改动拆分。建议首轮只排前两项；后续写入能力的投入取决于试点结果。

| 顺序 | 交付与入口 | 完成条件 |
| --- | --- | --- |
| 1 · 记录生成来源，约 1 人日 | 在 `apply-skeleton.mjs` 写出可提交的 `.koi-blueprint.json`，包含格式版本、上游仓库、完整提交 SHA、生成时的有效名称和标题、AI 资产开关、初始 Stable profile。发布归档携带来源；本地有未提交模板改动或缺少可信 SHA 时明确标记来源待确认。 | 默认生成与无 AI 生成均可重建相同产物。项目改名后仍可读取原始参数。`--dry-run` 零写入。有改动的模板不能被标记为可精确重现的干净提交。 |
| 2 · 只读预览与老项目接入，约 2–3 人日 | 在蓝图维护侧新增预览入口，指定业务项目和目标 SHA，输出新增、修改、删除、冲突及需要人工判断的路径。复用当前文件生成逻辑。 | 在 Linux 和 Windows 对上述历史版本对运行。默认版报告 doctor 和 Agent 资产，无 AI 版只报告相应变动；同一行冲突能看到旧、业务、新三个版本。预览前后业务 HEAD、索引和工作树一致。 |
| 3 · 应用与恢复，约 2–3 人日 | 先选一个有来源依据、改过业务且愿意试点的项目。在独立升级分支应用审阅后的结果。确认目标提交与预览一致，记录冲突路径、人工处理耗时和验证结果。 | 保留全部业务专有文件；应用前校验业务 HEAD、工作区及目标路径，状态变化则重新预览。冲突或门禁失败时基线仍指向旧版；验收后将升级结果与新基线记录在同一提交。再次升级到相同 SHA 应得到空差异。 |
| 4 · 消费项目回归，约 1–2 人日 | 给含 Agent 资产的生成项目接上 `node scripts/sync-agent-skills.mjs --check` 和 `npm run check:mcp`。添加一条 H5 首页烟测：构造首次失败、点击重试后成功的可重复场景。 | 故意改坏 Skill 入口或移除模板 MCP 条目，生成项目的 CI 失败；自定义 MCP 与无 AI 路径有单独样例。H5 断言用户能看到失败态、点击按钮并读到成功内容。涉及微信渲染时导入构建产物做同一路径的 IDE 验证。[当前首页](../skeleton/src/pages/home/index.vue) · [已有本机检测](weixin-devtools-mcp.md) |

### 文件怎么处理

- 模板维护的脚本、检查和说明，业务侧未改过就接收上游差异。已修改的同名文件按三方合并。业务新增的 Feature、Spec、测试和 ADR 留在原位。业务已删除的文件遇到上游修改、上游删除遇到业务修改、双方新增同名文件内容不同，都列入人工处理。
- `package.json`、锁文件、`src/manifest.json`、`src/pages.json`、`src/bootstrap/container.ts` 和客户端 MCP 配置列入重点审阅。保留业务 AppID、路由、依赖、脚本和自定义 MCP 服务。锁文件发生冲突时，先确定合并后的依赖清单，用项目声明的 npm 版本重新生成锁，再执行 `npm ci`。
- AI 开关沿用原始选择。启用时以 `.agent/skills/` 为正文，检查业务自有 Skill 和两个客户端的发现入口。只将版本控制下的项目文件带入合并；排除 `.env`、IDE 私有设置、依赖和构建目录。涉及已激活的微信 Alpha、本地未跟踪文件与目标路径碰撞、二进制双方修改或含混的重命名时，列出路径交由维护者决定。

### 今天已有业务项目怎样拿到更新

1. 在业务 Git 历史找到第一笔生成提交，从当年 README、命令记录或项目创建者核实蓝图 SHA、生成名称、标题和 AI 选项。对照该提交的模板文件，记下已经存在的业务改动。没有可靠基线时，先从新版产物逐项挑选需要的修复；来源状态保留为待确认。
2. 在业务仓库之外的空目录展开旧、新两个蓝图提交，各用自己的生成器、相同的原始参数生成到两个空目录。用 `git diff --no-index --stat old-app new-app` 阅读模板改动清单；退出码 1 表示存在差异。可以先挑一个容易验收的改动，例如开发环境指南和 doctor 脚本，以及它依赖的 npm script。
3. 对选中的改动逐项比较旧产物、业务版本和新产物，在干净的业务分支合并并审阅 diff。先做部分更新时记录已接收的改动，保留原基线。完整升级时，在业务根目录执行 `npm ci`、`npm run validate`，含 AI 资产的应用再运行两项离线检查。成功后提交；失败时保留原业务分支，并从升级分支重试。微信客户端、登录和运行时渲染有各自的观测步骤。[本地开发指引](../skeleton/LOCAL_DEVELOPMENT.md)

## 编译器与后续投入

在当前蓝图生成的两个同名 Stable 项目中，以官方 `vite-ts` 快照为依据，将试验组的 7 个 DCloud 编译器包从 `3.0.0-5010520260709002` 一起升到 `3.0.0-5030420261029002`，保留 Koi 的 Vue 3.4.21、Vite 5.2.8、Pinia 2.1.7 等直接依赖。两组都使用初始首页，未添加发票示例。[官方依赖快照](https://github.com/dcloudio/uni-preset-vue/blob/f747e3b11c51b3bff6c05e2b54f9a3173a590044/package.json#L38-L68) · [项目依赖检查](../skeleton/scripts/check-dcloud-cohort.mjs)

| macOS arm64，Node 22.18.0，npm 10.9.3 | 当前编译器 | 候选编译器 |
| --- | ---: | ---: |
| 从锁文件执行 `npm ci` | 通过 | 重算锁后通过 |
| 微信构建文件数 | 24 | 24 |
| 微信主包字节数 | 83,608 | 85,589 |

候选组通过完整 `npm run validate`，包括 31 项单测和双端构建。主包增加 1,981 字节（约 2.37%），仍低于仓库的 1,800 KiB 预算。可把编译器候选作为独立 PR，与升级预览并行推进。下一步用候选锁文件跑 Linux、Windows 验证，在微信开发者工具打开首页并记录渲染结果，再决定是否更新 Stable。这样业务项目可以分别选择接收蓝图工具修复和升级编译器。

试点记录三项数据：人工处理了哪些文件、耗时多久、双端验证是否通过。若反复卡在同一种配置变更，再为那一个版本跨度编写可重跑的迁移；若第二个独立业务项目也采用了相同流程，再评估批量升级 PR 或独立 CLI 包。当前就能独立交付的第一步，是在生成器合同里证明“任取一份新项目的来源记录，就能重建它最初的文件树”。[原有项目路线图](PROJECT_PLAN.md)
