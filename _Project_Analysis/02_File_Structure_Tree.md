# 02. 文件地图 (File Structure Tree)

## 目录树结构

```text
d:\project\best\
├── backend/                        <- 后端工程根目录
│   ├── data/
│   │   └── database.sqlite         <- SQLite 数据库文件 (生产环境数据存储)
│   ├── dist/                       <- [生成目录] TypeScript 编译后的 JS 文件
│   ├── src/                        <- 后端源代码
│   │   ├── db.ts                   <- 数据库连接与初始化脚本 (单例模式)
│   │   └── server.ts               <- 后端入口，API 路由定义
│   ├── Dockerfile                  <- 后端容器构建文件
│   ├── package.json                <- 后端依赖定义
│   └── tsconfig.json               <- 后端 TS 配置
├── components/                     <- 前端组件库
│   ├── AdminView.tsx               <- 管理后台 UI 组件
│   ├── Leaderboard.tsx             <- 排行榜逻辑组件
│   ├── LeaderboardItem.tsx         <- 排行榜单行条目组件
│   ├── LeaderboardView.tsx         <- 排行榜页面 UI 组件
│   └── VotingView.tsx              <- 投票页 UI 组件
├── dist/                           <- [生成目录] 前端构建产物 (Vite Build)
├── doc/                            <- 项目文档归档
│   ├── 00_Initial_Proposal.md
│   ├── ... (各类设计与需求文档)
│   └── 13_Frontend_Backend_Link_Analysis.md
├── .env                            <- 环境变量配置
├── App.tsx                         <- 前端主组件 (包含路由逻辑与页面级状态)
├── client.ts                       <- API 客户端封装 (Axios/Fetch 包装器)
├── constants.ts                    <- 前端常量定义
├── daemon_config_fix.json          <- [建议删除] 疑似错误的 Docker 守护进程配置文件
├── docker-compose.yml              <- 容器编排配置 (定义前后端与 Nginx 服务)
├── index.html                      <- 前端 HTML 模板
├── index.tsx                       <- 前端入口文件
├── metadata.json                   <- [建议删除] 项目元数据文件，用途不明
├── nginx.conf                      <- Nginx 反向代理配置
├── package.json                    <- 前端/根目录依赖定义
├── tsconfig.json                   <- 前端 TS 配置
├── types.ts                        <- 前端 TypeScript 类型定义 (接口/模型)
├── vite.config.ts                  <- Vite 构建工具配置
└── vite-env.d.ts                   <- Vite 环境变量类型声明
```

## 垃圾识别与清理建议

1.  **[建议删除]** `daemon_config_fix.json`: 看起来像是 Docker 守护进程的配置文件片段，不应存在于项目源码根目录中。
2.  **[建议删除]** `metadata.json`: 内容仅包含项目描述，非标准配置文件，若无自动化工具依赖此文件，建议删除。
3.  **[注意]** `backend/dist/` 和 `dist/`: 这些是编译生成目录，不应提交到版本控制系统 (Git) 中。
