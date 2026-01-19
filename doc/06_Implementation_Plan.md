# 详细实施方案

本方案采用“敏捷开发”模式，从 MVP (最小可行性产品) 逐步迭代到完整方案。

## 新增改造方案：倒计时与视觉节奏增强

### 目标
在投票端和大屏端增加统一倒计时，并实现“外边框渐变呼吸效果”，随着倒计时接近尾声逐步加快动画节奏，颜色由绿色过渡到红色，过渡中包含青色、黄色、橙色等渐变色。管理端提供倒计时时长配置与“开始投票”按钮。

### 关键交互设计
1. **右上角倒计时显示**：`mm:ss`，秒级更新，倒计时归零后固定为 `00:00`。
2. **渐变呼吸边框**：
   - 初始颜色：绿色/青色为主，呼吸频率较慢。
   - 中段过渡：青色 → 黄色 → 橙色，频率逐步加快。
   - 末段：红色为主，高频呼吸，营造紧迫感。
3. **同步策略**：倒计时由后端统一下发 `end_at` 与 `duration_seconds`，前端以服务器时间为准计算剩余时间。

### 技术改造要点
1. **后端**
   - 扩展 `settings` 表：新增 `countdown_duration_seconds`、`countdown_end_at`、`countdown_status`。
   - 新增 `POST /api/admin/countdown` 管理接口。
   - `/api/programs` 额外返回倒计时配置与状态。
2. **前端**
   - 投票端与大屏端统一复用倒计时组件。
   - 通过 `requestAnimationFrame` 或 `setInterval(1000)` 计算倒计时并驱动动画速度参数。
   - 使用 CSS 自定义属性控制动画速度与渐变色序列，随剩余时间动态更新。
3. **管理端**
   - 增加倒计时时长输入框（分钟/秒）与“开始投票”按钮。
   - 提交后更新倒计时状态并同步下发至前端。

### 风险与对策
1. **时间同步误差**：前端以 `end_at` 作为绝对时间戳，避免不同客户端的时间差造成不同步。
2. **动画性能**：避免高频 re-render，使用 CSS 动画 + CSS 变量更新，减小 React 渲染压力。
3. **状态一致性**：倒计时仅由管理端发起，前端只读显示，避免多个来源造成冲突。

## 阶段一：后端基础建设 (Backend Foundation)
**目标**：建立 API 服务，打通数据库，不再使用 Mock 数据。
1.  初始化 `backend` 目录，安装 `express`, `sqlite3`, `cors`。
2.  创建 `db.ts`，实现 SQLite 建表脚本 (programs, vote_records)。
3.  实现 `server.ts`，开启 3000 端口。
4.  编写 `/api/programs` (GET) 和 `/api/vote` (POST) 接口。
5.  **测试**：使用 Postman 或 curl 测试接口通断。

## 阶段二：前端改造与重构 (Frontend Refactoring)
**目标**：在保留现有 UI/UX 效果的基础上，将单体 App 拆分为三端路由，并对接真实 API。
1.  **资产迁移**：保留现有的 `components` (Leaderboard, VotingView 等) 和样式文件，确保视觉效果不变。
2.  **路由改造**：
    *   引入 `react-router-dom`。
    *   将 `App.tsx` 中的条件渲染逻辑改为路由配置：
        *   原 `VotingView` -> `/vote`
        *   原 `LeaderboardView` -> `/screen`
        *   原 `AdminView` -> `/admin`
3.  **数据层改造**：
    *   移除前端硬编码的 `initialData` 和本地状态模拟逻辑。
    *   封装 `api.ts`，替换组件内的 `useState` 更新逻辑为 `useEffect` + API 请求。
    *   **VotingView**：修改点击事件，改为多选逻辑 + 提交按钮，保留原有卡片样式。
    *   **LeaderboardView**：保留原有动画组件，仅将数据源改为 API 轮询结果。
4.  **配置代理**：修改 `vite.config.ts`，配置 proxy 解决本地开发跨域问题。

## 阶段三：安全与管理增强 (Security & Admin)
**目标**：完善防刷和管理功能。
1.  后端实现 `POST /login` 逻辑，简单校验密码。
2.  后端实现 `POST /admin/reset` 重置逻辑。
3.  后端添加 IP 防刷中间件：检查 `vote_records` 表中该 IP 是否已存在记录。
4.  前端 Admin 页完善 Token 存储和请求头注入。

## 阶段四：容器化与部署 (Dockerization)
**目标**：产出可交付的 Docker 镜像。
1.  **Frontend Dockerfile**:
    *   Stage 1: Build (Node.js) -> `npm run build`
    *   Stage 2: Serve (Nginx) -> 复制 `dist` 到 nginx html 目录，配置 nginx.conf 反代 `/api`。
2.  **Backend Dockerfile**:
    *   Node.js 环境，`npm install` -> `npm start`。
3.  **docker-compose.yml**:
    *   定义 `frontend` 服务 (端口 80:80)。
    *   定义 `backend` 服务 (端口 3000:3000)。
    *   挂载 `./backend/data:/app/data` 确保数据持久化。

## 阶段五：集成测试与交付 (Integration Test)
1.  本地运行 `docker-compose up --build`。
2.  模拟多设备访问 (手机浏览器 + PC 浏览器)。
3.  验证数据同步速度和防刷逻辑。
4.  推送代码到 Git 仓库。
