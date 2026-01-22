# 测试资料目录

本目录用于沉淀投票系统后续的测试用例、压测脚本与测试报告，建议按以下约定维护：

- load/：性能与容量（并发/压测/稳定性）
- scripts/：快速验证脚本（竞态、回归、批量请求）
- reports/：测试结果与结论（可按日期或版本归档）

## 快速压测（300 人并发）

仓库已内置 k6 压测脚本（见 [load/k6_300users.js](file:///d:/project/best/tests/load/k6_300users.js) 以及原始脚本 [loadtest/k6_300users.js](file:///d:/project/best/loadtest/k6_300users.js)）。

示例（以 k6 为例）：

```bash
k6 run -e TARGET=http://172.16.37.201/leaderboard -e VUS=300 -e DURATION=90s tests/load/k6_300users.js
```

如需指定“首屏页面路径”，可使用 `PAGE_PATH`（例如压投票页）：

```bash
k6 run -e TARGET=http://172.16.37.201 -e PAGE_PATH=/vote -e VUS=300 -e DURATION=90s tests/load/k6_300users.js
```

### 最严苛（300 人，快速爬升 + 高频轮询 + 投票集中爆发）

只压“榜单访问/接口轮询”（不改票数）：

```bash
k6 run -e TARGET=http://172.16.37.201/leaderboard -e VUS=300 -e SKIP_VOTE=1 -e POLL_INTERVAL_SECONDS=0.5 -e RAMP_UP=20s -e SOAK=120s -e RAMP_DOWN=10s tests/load/k6_strict_300users.js
```

同时压“投票写入”（会改票数；投票会在前 5 秒内随机触发）：

```bash
k6 run -e TARGET=http://172.16.37.201/vote -e VUS=300 -e SKIP_VOTE=0 -e VOTE_WINDOW_SECONDS=5 -e POLL_INTERVAL_SECONDS=0.5 -e RAMP_UP=20s -e SOAK=120s -e RAMP_DOWN=10s tests/load/k6_strict_300users.js
```

### 爆发投票 + 轮询并行（会改票数）

该脚本与 `node_loadtest.mjs` 的行为一致：首屏访问一次 + 循环拉取 `/api/programs`，并额外在指定时间点集中发起投票。

```bash
k6 run -e TARGET=http://172.16.37.201/leaderboard -e VUS=300 -e POLL_INTERVAL_SECONDS=0.5 -e RAMP_UP=10s -e SOAK=60s -e RAMP_DOWN=5s -e VOTE_START_TIME=15s -e VOTE_VUS=300 tests/load/k6_burst_poll_vote_300users.js
```

### 贴近真实（大屏 1 台 + 手机 300 人 + 集中投票）

该脚本按当前前端行为建模：手机端主要轮询 `/api/config`（用于倒计时 UI），大屏端轮询 `/api/programs`（用于榜单），并在指定时间点集中提交投票。

```bash
k6 run -e TARGET=http://172.16.37.201 -e MOBILE_VUS=300 -e CONFIG_POLL_INTERVAL_SECONDS=1 -e SCREEN_VUS=1 -e SCREEN_POLL_INTERVAL_SECONDS=2 -e VOTE_VUS=300 -e VOTE_START_TIME=15s -e RAMP_UP=10s -e SOAK=60s -e RAMP_DOWN=5s tests/load/k6_realistic_screen_vote_300users.js
```

### 贴近真实（大屏 1 台 + 手机 300 人 + 分批次投票）

将 300 人投票拆成三波写入（默认 100/100/100），用于观察“分时间段分批次写入”的整体稳定性与延迟。

```bash
k6 run -e TARGET=http://122.51.60.20 -e MOBILE_VUS=300 -e CONFIG_POLL_INTERVAL_SECONDS=1 -e SCREEN_VUS=1 -e SCREEN_POLL_INTERVAL_SECONDS=2 -e VOTE_W1_VUS=100 -e VOTE_W2_VUS=100 -e VOTE_W3_VUS=100 -e VOTE_W1_START=15s -e VOTE_W2_START=25s -e VOTE_W3_START=35s -e RAMP_UP=10s -e SOAK=60s -e RAMP_DOWN=5s tests/load/k6_realistic_screen_vote_300users_waves.js
```

### 1000 人 30s 内异步投票（尽量保证持续写入）

该脚本模拟 1000 人打开投票页并轮询 `/api/config`，在 0~30s 内随机时刻提交投票（因此几乎每 2 秒都会有新的写入发生）。

```bash
k6 run -e TARGET=http://122.51.60.20 -e TOTAL_USERS=1000 -e WINDOW_SECONDS=30 -e CONFIG_POLL_INTERVAL_SECONDS=1 -e SCREEN_VUS=1 -e SCREEN_POLL_INTERVAL_SECONDS=2 tests/load/k6_1000users_30s_async_writes.js
```

### k6 未安装时（Node 版简易压测）

如果当前机器没有安装 k6，可用 Node（内置 fetch）跑一个“简易版”并发模拟，主要用于快速验证 300 人访问/投票时的错误率与延迟量级：

```bash
node tests/load/node_loadtest.mjs http://172.16.37.201/leaderboard
```

可用环境变量控制规模（示例）：

```bash
set USERS=300
set DURATION_SECONDS=90
set POLL_INTERVAL_SECONDS=2
set VOTE_WINDOW_SECONDS=30
node tests/load/node_loadtest.mjs http://172.16.37.201/vote
```

如果只想压“排行榜访问/轮询”，不触发投票写入，可加：

```bash
set SKIP_VOTE=1
node tests/load/node_loadtest.mjs http://172.16.37.201/leaderboard
```

## 竞态回归（同一用户重复投票）

该脚本用于验证“同一 clientId 同时发起多次投票”时，服务端能否保证只成功一次，其余被拒绝。

```bash
node tests/scripts/double_vote_race.mjs http://172.16.37.201/vote
```
