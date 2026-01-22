# 01. 项目全景图 (Project Overview)

## 1. 技术栈摘要 (Technology Stack)

### 核心语言
- **TypeScript**: 前后端统一使用 TypeScript 开发。
  - Frontend: ~5.8.2
  - Backend: ^5.7.3

### 前端 (Frontend)
- **Framework**: React 19
- **Build Tool**: Vite 6.2.0
- **UI/Styling**: Tailwind CSS (推断), Framer Motion (动画), Lucide React (图标)
- **Routing**: React Router DOM 7.12.0

### 后端 (Backend)
- **Runtime**: Node.js
- **Framework**: Express 4.18.2
- **Database**: SQLite3 (本地文件数据库)
- **Middleware**: cors, body-parser

### 基础设施 (Infrastructure)
- **Containerization**: Docker, Docker Compose
- **Web Server**: Nginx (作为反向代理)

---

## 2. 功能概述 (Functionality Overview)

本项目是一个 **实时现场投票系统 (Real-time Voting System)**，主要用于各类比赛、表演或活动的现场互动环节。

### 核心功能模块
1. **大众投票端 (Voting Interface)**
   - 允许用户查看候选节目/选手。
   - 支持批量投票（受限于系统配置的票数限制）。
   - 防止重复投票（基于 Client ID 和 IP 地址）。

2. **实时大屏排行榜 (Live Leaderboard)**
   - 专为大屏幕展示设计。
   - 实时轮询后端数据（默认 2秒间隔）。
   - 展示选手排名、票数及动态排名变化（上升/下降趋势）。

3. **管理后台 (Admin Dashboard)**
   - 需要简易密码验证登录。
   - **规则控制**：开启/关闭投票通道，修改单人最大票数限制。
   - **数据管理**：添加/删除节目，一键重置所有投票数据。

---

## 3. 入口分析 (Entry Points)

| 端 (Side) | 入口文件 (Entry Point) | 说明 |
| :--- | :--- | :--- |
| **Frontend** | [index.tsx](file:///d:/project/best/index.tsx) | React 应用挂载点，渲染 `<App />` |
| **Backend** | [server.ts](file:///d:/project/best/backend/src/server.ts) | Express 服务器启动文件，定义了 API 路由和中间件 |
