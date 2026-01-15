# 前后端链路设计与故障根因报告（服务器部署版）

**日期**: 2026-01-15  
**系统名称**: 是为科技年会最佳节目实时投票系统  
**现象**: 管理端登录后提示“连接服务器失败”；投票页/大屏无法加载节目数据。  

## 1. 目标链路（正确工作时）

系统采用同域部署：浏览器只访问 `http://122.51.60.20`，前端与 API 同源，从而规避手机端常见的 HTTP/HTTPS、跨域问题。

**请求路径：**
- 浏览器访问 `/vote`、`/leaderboard`、`/admin` → 命中 **Nginx(frontend 容器)** → 返回静态页面与资源
- 浏览器访问 `/api/*` → 命中 **Nginx(frontend 容器)** 的反向代理 → 转发给 **backend 容器** 的 `3000` 端口
- backend 访问 **SQLite**：路径 `/app/data/database.sqlite`（由宿主机 `./backend/data` 挂载进入容器）

**关键配置：**
- [nginx.conf](file:///d:/project/best/nginx.conf)：`location /api { proxy_pass http://backend:3000; }`
- [docker-compose.yml](file:///d:/project/best/docker-compose.yml)：frontend 与 backend 在同一 compose 网络
- [client.ts](file:///d:/project/best/client.ts)：默认 `VITE_API_URL=/api`，请求 `fetch('/api/...')`

## 2. 为什么会出现 “Failed to fetch / 连接服务器失败”

该类错误在浏览器端本质上意味着：`/api/*` 请求未能成功建立连接或未得到可用响应。

在本项目中，最常见的触发点是：**backend 容器未能正常启动/持续运行**。此时 Nginx 代理 `/api` 会出现两种表现：
- backend 端口不可用 → Nginx 可能返回 `502 Bad Gateway`（浏览器仍算“拿到响应”，但内容为 HTML）
- 网络层直接失败（容器反复崩溃、连接被重置等）→ 浏览器直接报 `TypeError: Failed to fetch`

## 3. 本次故障的高概率根因（已修复）

### 3.1 后端启动方式依赖运行期外网下载
后端曾使用 `npx ts-node src/server.ts` 启动。该方式会在容器运行期尝试下载 `ts-node`（以及其依赖），在服务器存在以下情况时会导致 backend 启动失败、直接退出：
- npm 镜像访问受限/临时网络抖动
- 容器启动阶段网络不可用

**结果**：前端所有 `/api/*` 都不可达，导致管理端登录、节目列表获取全部失败。

### 3.2 非 JSON 的 502/HTML 响应导致前端报错信息不够直观
当 Nginx 返回 502 HTML 页面时，前端若强制 `response.json()` 会抛出解析异常，进一步掩盖真实状态码。

## 4. 已实施修复（代码层）

### 4.1 后端：构建期编译 TS，运行期执行 JS
- [backend/Dockerfile](file:///d:/project/best/backend/Dockerfile) 改为：
  - build 阶段安装依赖 + `npm run build` 生成 `dist`
  - runtime 阶段 `node dist/server.js` 启动
- [backend/package.json](file:///d:/project/best/backend/package.json) 新增 `build/start` 脚本与 TypeScript 相关 devDependencies

### 4.2 前端：增强 API 错误识别能力
- [client.ts](file:///d:/project/best/client.ts) 增加统一的 `fetchJson` 解析逻辑：
  - 对 `502 HTML`、`非 JSON` 响应给出更明确的错误信息
  - 对网络异常（真正的 `Failed to fetch`）原样抛出，便于定位网络/容器问题

### 4.3 后端：补齐管理端 reset 鉴权
- [server.ts](file:///d:/project/best/backend/src/server.ts) 的 `/api/admin/reset` 已强制 Token 校验，避免未授权重置。

## 5. 服务器侧快速自检（定位是否仍是后端容器问题）

在服务器执行（项目目录内）：

1) 重建并启动（必须带 `--build`）  
```bash
git pull
sudo docker-compose down
sudo docker-compose up -d --build
```

2) 查看容器是否正常运行  
```bash
sudo docker ps
```

3) 直接打后端端口（绕过 Nginx）  
```bash
curl -i http://localhost:3000/api/programs
```

4) 走 Nginx 代理验证 `/api`  
```bash
curl -i http://localhost/api/programs
```

5) 查看 backend 日志（最关键）  
```bash
sudo docker logs --tail 200 nebulavote-backend
```

