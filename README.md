# dsh-arknights-agent

DeepSeek Harness 的「明日方舟」智能体预设 bundle：装好后在新会话里选「明日方舟」，即可得到会打关卡、推关、跑肉鸽、自己排查问题的代理指挥助手。

- 仓库：<https://github.com/ABccgh/dsh-arknights-agent>（0.1.0，2026-10-28 发布）
- bundle：`@local/arknights-agent`，预设行 id：`preset-arknights`，预设 id：`arknights`
- 依赖：先装 [`dsh-arknights`](https://github.com/ABccgh/dsh-arknights)（本预设的工具代码在它里面）
- 本仓库**不含可执行代码**（无 `lib/`），只有 patch + locale + 图标 + 一个包完整性测试

## 这是什么

- 本仓库只有**预设声明**：`cordis.patch.yml` + locale + 图标，没有工具代码。
- 预设里的工具行指向已安装的 `dsh-arknights` 副本：
  `%USERPROFILE%\dsh-bundles\arknights\lib\preset\index.js`（package export `./preset`）。
- 它在预设作用域内注册 7 个查询/排查工具，全部走 adb / MuMuManager / 本地文件，
  不持有 MaaCore 会话，因此不会和全局插件抢实例。

## 与全局插件的关系

- 全局插件 `@local/arknights`（Loader 行 id `arknights`）提供 5 个打关卡工具
  （`ark_fight` / `ark_push` / `ark_rogue` / `ark_stop` / `ark_status`）+ 侧栏面板 + `/ark` 命令 + HTTP 路由。
- 全局工具在所有会话可见；本预设用 `allowGlobalToolPrefixes` 白名单把它们保留下来，
  `ark_` / `prts_` / `input_` 之外的工具会在方舟会话里被隐藏。

## 如何启用

1. 复制到安装位置（patch 用 `file:` URL 引用工具代码，路径必须与 patch 一致）：

   ```powershell
   robocopy "<仓库路径>" "$env:USERPROFILE\dsh-bundles\arknights-agent" /MIR /XD .git test node_modules
   ```

2. `plugin_manager` → `install_bundle`，target 指向 `%USERPROFILE%\dsh-bundles\arknights-agent`。
3. 打开**新会话**，在预设列表里选「明日方舟」。
4. 前提：`%USERPROFILE%\dsh-bundles\arknights` 已存在，且 MAA / MuMu 12 已装好。

### 换机器 / 换安装路径（唯一需要手工改的地方）

`cordis.patch.yml` 里工具行的 `name` 是**本机绝对路径**：

```yaml
name: 'file:///C:/Users/11210/dsh-bundles/arknights/lib/preset/index.js?v=2'
```

装到别的机器或别的用户名下时，把 `C:/Users/11210/...` 换成实际路径（正斜杠），
否则预设会显示「加载失败」（客户端只显示 broken，原因看 `%TEMP%\arknights-preset-activation.json`）。
装好后按「关开一次本 bundle」重载即可，不必重启 DSH。

> 同一路径还会出现在 `DO-NOT-DELETE.txt` 里 —— 那只是安装目录标记文件的说明文字，不参与运行；
> `test/package.test.js` 只校验 URL 形态（`file:///…/lib/preset/index.js?v=N`），不写死用户目录，
> 所以**真正要改的只有 `cordis.patch.yml` 一行**。

## 可用工具一览（12 个）

| 来源 | 工具 | 用途 |
| --- | --- | --- |
| 全局 | `ark_fight` | 打指定关卡（先出计划，确认后执行） |
| 全局 | `ark_push` | 按主线顺序推关 |
| 全局 | `ark_rogue` | 集成战略（肉鸽） |
| 全局 | `ark_status` | 链路状态与关卡账本 |
| 全局 | `ark_stop` | 中止当前任务链 |
| 预设 | `ark_stages` | 查关卡、难度、理智消耗 |
| 预设 | `ark_solutions` | 查作业站候选（id/评分/干员需求，含可用调用串） |
| 预设 | `ark_screen` | 抓当前游戏画面存 PNG |
| 预设 | `ark_device` | adb 设备与连接状态自检 |
| 预设 | `ark_game` | 启动 / 关闭游戏本体 |
| 预设 | `ark_emulator` | MuMu 状态与启动 |
| 预设 | `ark_log` | 读 MAA 日志尾部 |

另保留 `prts_*`（PRTS wiki）与 `input_*`（键鼠/截图）可见，真机排查会用到。

## 配置项

都在 `cordis.patch.yml` 的工具行 `config` 里；路径**留空 = 自动探测**（推荐）。

- `maaPath` / `mumuInstallPath` / `adbPath` / `managerPath` / `logFile` / `screenshotDir` / `ledgerFile`：各类路径。
- `address`：adb 地址，留空由 VM 配置推出（通常 `127.0.0.1:16384`）；`vmIndex` 多开时选实例（默认 0）。
- `maxScreenshots` / `maxLogLines`：截图保留张数 / 日志返回行数上限；`clientType`：`Official`（官服）/ `Bilibili`（B 服）；`launchTimeoutMs`：启动超时。
- `allowGlobalToolPrefixes`：全局工具白名单（默认 `ark_` / `prts_` / `input_`；空数组 = 关闭屏蔽）。

## 排障

- 预设激活失败时客户端只显示 broken，看现场：`%TEMP%\arknights-preset-activation.json`（`ok` / `tools` / `maskedGlobals` / `error`）。
- 改过 `lib/preset/` 的代码：把 `cordis.patch.yml` 里 `file:` URL 的 `?v=2` 加一，或重启 DSH。
- 装完没有工具：确认 `%USERPROFILE%\dsh-bundles\arknights\lib\preset\index.js` 存在，并在新会话里重选预设。

## 限制

- 预设激活失败只显示 broken，没有更多 UI 反馈；以上述 JSON 为准。
- 白名单之外的工具会被隐藏（不是删除），换回默认预设即恢复。
- 本 bundle 不含可执行代码（无 `lib/`）；`npm test` 跑的是 `test/package.test.js`（12 例包完整性检查：字段 / patch 文本 / locale 一致 / 图标 / 文件齐全守卫）。
- 与 `dsh-arknights` 强耦合：`file:` URL 指向它的安装目录，升级/挪动那个目录时要同步改这里。
