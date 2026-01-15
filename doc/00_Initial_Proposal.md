# 年会实时投票系统 - 初步需求与架构提案

## 1. 核心需求分析 (Product Requirements)

我们将系统拆分为三个独立但数据互通的端，通过统一的后端服务进行连接。

### 1.1 移动端：大众投票 (Mobile Client)
*   **入口**：用户通过扫描二维码或点击链接访问（手机浏览器）。
*   **核心功能**：
    *   展示节目列表。
    *   **投票逻辑**：点击“投票”按钮，数据实时发送至服务器。
    *   **防刷机制**：
        *   **初级**：投票成功后，本地记录状态，再次进入显示“您已投过票”。
        *   **高级**：后端根据 IP + 设备指纹限制，同一设备/IP 只能投一次（建议采用 IP+Cookie 方案，平衡体验与安全，无需繁琐登录）。
    *   **反馈**：投票成功后的即时弹窗/页面反馈。

### 1.2 大屏端：实时战报 (Big Screen Client)
*   **入口**：部署在会场大屏电脑上，通过特定 URL 访问。
*   **核心功能**：
    *   **数据展示**：炫酷的排行榜/柱状图，显示各节目当前票数。
    *   **实时性**：前端通过**轮询 (Polling)** 机制，每 **2秒** 向后端请求一次最新数据，实现准实时刷新。
    *   **视觉**：保持高可视化的 UI 设计。

### 1.3 管理端：后台控制 (Admin Dashboard)
*   **入口**：通过特定 URL 访问（如 `/admin`）。
*   **鉴权**：
    *   进入时必须输入口令：`54zds`。
    *   验证通过后发放 Token，后续操作需携带此 Token。
*   **核心功能**：
    *   **节目管理**：增加、删除、修改节目信息（名称、ID）。
    *   **数据重置**：一键清空所有投票数据（用于彩排后重置）。

---

## 2. 技术架构设计 (Technical Architecture)

鉴于你本地已安装 Docker 且服务器为 Ubuntu，我们将采用 **容器化全栈开发** 模式。

### 2.1 技术栈选型
*   **前端 (Frontend)**：继续使用 **React + TypeScript + Vite**。
    *   利用 `react-router-dom` 将单页面应用 (SPA) 拆分为三个路由：`/vote` (投票), `/screen` (大屏), `/admin` (管理)。
*   **后端 (Backend)**：新增 **Node.js (Express 或 NestJS)**。
    *   选用 Node.js 是因为前后端语言统一 (TypeScript)，开发效率最高，维护成本最低。
*   **数据库 (Database)**：**SQLite** (文件型数据库)。
    *   **理由**：年会场景数据量有限（几百/几千人），SQLite 无需额外配置复杂的 MySQL 服务器，且数据文件可以直接挂载，备份极其方便，非常适合这种轻量级、短周期的项目。
*   **部署 (DevOps)**：**Docker + Docker Compose**。
    *   `docker-compose.yml` 编排前端（Nginx 托管）和后端服务。

### 2.2 数据接口定义 (API Interface)
我们需要确保前后端接口统一，初步规划如下 RESTful API：

1.  `GET /api/programs` - 获取所有节目及当前票数（大屏、手机端用）。
2.  `POST /api/vote` - 投票（手机端用，包含节目ID）。
3.  `POST /api/login` - 管理员登录（验证 `54zds`）。
4.  `POST /api/admin/programs` - 添加/修改节目（管理端用）。
5.  `DELETE /api/admin/programs/:id` - 删除节目（管理端用）。
6.  `POST /api/admin/reset` - 重置所有数据（管理端用）。

### 2.3 目录结构规划
我们将对现有目录进行重构，采用 Monorepo 风格或简单的分层结构：

```text
/best
  ├── docker-compose.yml      # 统管整个系统启动
  ├── frontend/               # 现有的 React 项目（需移动进去）
  │    ├── Dockerfile
  │    ├── src/
  │    │   ├── pages/         # 拆分 Voting, Leaderboard, Admin
  │    │   └── services/      # 统一 API 请求封装
  └── backend/                # 新建的 Node.js 服务
       ├── Dockerfile
       ├── src/
       │   ├── server.ts      # 主入口
       │   └── db.ts          # SQLite 数据库连接
       └── data/              # 存放 database.sqlite
```
