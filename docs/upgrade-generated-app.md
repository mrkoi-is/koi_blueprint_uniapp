# 升级已生成的 Koi 应用

在蓝图仓库根目录执行下文的 `npm run upgrade`。应用目录需要是一个已提交
初始源码的 Git 仓库。准备 Node 22.13 以上的受支持版本、npm、支持
`git merge-tree --write-tree` 的 Git，以及系统的 `tar`。

## 先预览

项目来源有记录时，提供应用路径和目标蓝图的完整提交 SHA。

```sh
git fetch origin
npm run upgrade -- preview ../invoice-app --to TARGET_SHA
```

旧应用可以用原始蓝图提交和原始生成参数预览。下面的历史提交对应本仓库
的发票样例。项目名、标题和 AI 开关请替换成创建应用时的值。

```sh
npm run upgrade -- preview ../invoice-app \
  --from 15ca027698f06f93033eba64bfa7cecdce1bfd4b \
  --to adff9e557340261f8594a4aa232591876558567d \
  --name invoice-demo --title "Invoice Demo" --ai-assets
```

创建时关闭了 AI 资产的项目改用 `--no-ai-assets`。如果来源尚未确认，
先从应用早期 Git 提交和生成记录核实。也可以在另一目录生成目标版本，
逐项对照并接收需要的文件，保留已有基线。

预览读取应用当前 Git 提交。退出码 `0` 表示可直接合并，`1` 表示有冲突
或本地文件占用了目标路径，`2` 提示来源或运行环境存在问题。用原命令
追加 `--show-conflict README.md` 可以看冲突文件在旧蓝图、当前应用和新版
中的内容。客户端配置可能包含项目自己的连接信息，请在本机查看。

## 应用与处理冲突

提交应用的本地改动。将预览命令里的 `preview` 改成 `apply`，保留相同的目标
与生成参数，并添加 `--expect-head APP_HEAD`。这里的值是预览输出的
完整 `App HEAD`。

如果有冲突，工具会打印独立工作目录。用编辑器解决冲突并用 `git add` 或
`git rm` 暂存决议。重点审阅业务路由、AppID、自定义依赖及 MCP 服务。
锁文件冲突时，先确认合并后的依赖清单，用应用指定的 npm 版本更新锁文件，
再暂存。继续命令会从锁文件安装并运行应用的 `npm run validate`。

```sh
npm run upgrade -- continue ../invoice-app
```

验收通过后，应用仓库出现 `koi-upgrade-<目标 SHA 的前 12 位>` 分支。
在应用仓库审阅这一提交，通过本地合并或业务项目自己的 PR 采用。
结果与新基线都在这一提交中。

```sh
npm run upgrade -- abort ../invoice-app
```

尚在处理中的升级可用上面的命令放弃。它移除本次独立工作目录及其中尚未
采用的决议。已经合入的升级可在应用仓库用 `git revert UPGRADE_COMMIT`
回退，`UPGRADE_COMMIT` 为升级结果的提交 SHA。
