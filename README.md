# dsh-arknights-agent

DeepSeek Harness 的「明日方舟」智能体预设 bundle（1.0.0）：装好后在新会话里选「明日方舟」，
即可得到会打关卡、推关、跑肉鸽、做日常、查资料与规划刷图、并能自己排查问题的代理指挥助手。

- 仓库：<https://github.com/ABccgh/dsh-arknights-agent>
- bundle：`@local/arknights-agent`，预设行 id：`preset-arknights`，预设 id：`arknights`
- 依赖：先装 [`dsh-arknights`](https://github.com/ABccgh/dsh-arknights)（全局工具与预设工具代码都在它里面）
- 本仓库**不含可执行代码**（无 `lib/`），只有 patch + locale + 图标 + 一个包完整性测试

## 这是什么

- 本仓库只有**预设声明**：`cordis.patch.yml` + locale + 图标，没有工具代码。
- 预设里的工具行指向已安装的 `dsh-arknights` 副本：
  `%USERPROFILE%\dsh-bundles\arknights\lib\preset\index.js`（package export `./preset`）。
- 它在预设作用域内注册 **2 个**辅助工具：`ark_diag`（现场排查六动作）与 `ark_solutions`（作业站浏览）。
  两者全部走 adb / MuMuManager / 本地文件 / 作业站 HTTP，**不持有 MaaCore 会话**，
  因此不会和全局插件抢实例。
- 预设同时保留全局的 **13 个** `ark_*` 工具（打关/推关/肉鸽/日常/资料/账本/停止）与
  **10 个** `prts_*` 资料工具；全局工具在所有会话可见，白名单决定方舟会话里保留哪些前缀。

## 安装

1. 先把 `dsh-arknights` 复制到安装位置（工具代码以 `file:` URL 引用它）：

   ```powershell
   robocopy "<dsh-arknights 仓库路径>" "$env:USERPROFILE\dsh-bundles\arknights" /MIR /XD .git test node_modules
   ```

2. 把本仓库复制到安装位置：

   ```powershell
   robocopy "<本仓库路径>" "$env:USERPROFILE\dsh-bundles\arknights-agent" /MIR /XD .git test node_modules
   ```

3. 用 `plugin_manager` 安装：

   ```
   plugin_manager  action: install_bundle  target: %USERPROFILE%\dsh-bundles\arknights-agent
   ```

   管理器会写入 profile 并选中该 bundle。**不要手改 profile 的 `package.json` / `cordis.patch.yml`**。

4. 打开**新会话**，在预设列表里选「明日方舟」。
   前提：`%USERPROFILE%\dsh-bundles\arknights` 已存在，且 MAA / MuMu 12 已装好。

### 换机器 / 换安装路径（唯一需要手工改的地方）

`cordis.patch.yml` 里工具行的 `name` 是**本机绝对路径**：

```yaml
name: 'file:///C:/Users/11210/dsh-bundles/arknights/lib/preset/index.js?v=3'
```

装到别的机器或别的用户名下时，把 `C:/Users/11210/...` 换成实际路径（正斜杠），
否则预设会显示「加载失败」（客户端只显示 broken，原因看 `%TEMP%\arknights-preset-activation.json`）。
`?v=3` 是 ESM 缓存标记：改过 `lib/preset/` 的代码后把它加一（`?v=4`），或**重启 DSH**。

> 同一路径还会出现在 `DO-NOT-DELETE.txt` 里 —— 那只是安装目录标记文件的说明文字，不参与运行；
> `test/package.test.js` 校验 URL 的完整形态（`file:///…/lib/preset/index.js?v=3`），
> 所以**真正要改的只有 `cordis.patch.yml` 一行**。

## 工具面

| 来源 | 工具 | 用途 |
| --- | --- | --- |
| 全局 | `ark_status` | 链路状态、当前任务、理智、关卡账本 |
| 全局 | `ark_fight` | 打指定关卡（`confirm=false` 只出计划，确认后执行） |
| 全局 | `ark_push` | 按主线顺序推关（已满星跳过，遇未解锁停下） |
| 全局 | `ark_rogue` | 集成战略（肉鸽，默认后台跑） |
| 全局 | `ark_daily` | 日常一条龙（领奖 / 信用 / 基建 / 公招 / 仓库） |
| 全局 | `ark_recruit` | 公招（`analyze` 只读 / `execute` 执行） |
| 全局 | `ark_infrast` | 基建换班、无人机 |
| 全局 | `ark_mall` | 信用商店购买 |
| 全局 | `ark_award` | 领取奖励（邮件 / 单抽 / 合成玉 / 签到） |
| 全局 | `ark_box` | 仓库 / 干员盒快照（可能耗时 5–20 分钟） |
| 全局 | `ark_data` | 关卡 / 材料 / 干员 / 活动 / 搜索资料 |
| 全局 | `ark_plan` | 刷材料规划（掉率与期望理智） |
| 全局 | `ark_stop` | 中止当前任务链 |
| 预设 | `ark_diag` | 现场排查：`action=screen/logs/device/emulator/game/probe` |
| 预设 | `ark_solutions` | 作业站浏览：id / 评分 / 干员需求 / `is_raid` / 难度 + `ark_fight copilotId=` 调用串 |
| PRTS | `prts_*`（10 个） | wiki 检索、正文、目录、元数据、分类、最近改动、`prts_operator` 干员档案 |

## 白名单与工具屏蔽

预设行的工具行里：

```yaml
allowGlobalToolPrefixes:
  - ark_
  - prts_
  - input_
```

- 只有这三个前缀的工具会保留在方舟会话里；其余已注册的全局工具会被 `ctx.tools.restrict` **隐藏**（不是删除）。
- `input_*`（键鼠 / 截图）用于真机排查；`prts_*` 用于查资料。
- 空数组 = 关闭屏蔽（所有工具可见）；改完把 preset bundle 关开一次即可生效。

## Skill

- 本预设自带 skill 的**源文件**在 `dsh-arknights/skill/SKILL.md`，安装副本在
  `%USERPROFILE%\.agents\skills\arknights\SKILL.md`；部署时由 `dsh-arknights` 的安装步骤一并复制。
- persona 只写硬规则；分步细节（确认矩阵、难度、理智不足、错误码、battle-start 诊断）以 skill 为准。

## 排障

- 预设激活失败时客户端只显示 broken，看现场：`%TEMP%\arknights-preset-activation.json`
  （`ok` / `presetVersion` / `tools` / `maskedGlobals` / `error`）。
- 装完没有工具：确认 `%USERPROFILE%\dsh-bundles\arknights\lib\preset\index.js` 存在，
  再在新会话里重选预设；`file:` URL 必须与本机路径一致。
- 改过 `lib/preset/` 的代码：把 `cordis.patch.yml` 里 `file:` URL 的 `?v=3` 加一，或**重启 DSH**。
- 预设工具都报 `E_CONNECT` / `E_MAA_NOT_FOUND`：先在新会话里跑 `ark_diag action=probe` 看探测结果。
- 工具被隐藏了：检查 `allowGlobalToolPrefixes` 是否被改成不包含对应前缀。

## 限制

- 预设激活失败只显示 broken，没有更多 UI 反馈；以上述 JSON 为准。
- 白名单之外的工具会被隐藏（不是删除），换回默认预设即恢复。
- 本 bundle 不含可执行代码（无 `lib/`）；`npm test` 跑的是 `test/package.test.js`（包完整性检查：
  字段 / patch 文本 / URL 与白名单 / persona 关键词 / locale 一致 / 图标 / README）。
- 与 `dsh-arknights` 强耦合：`file:` URL 指向它的安装目录，升级/挪动那个目录时要同步改这里。
