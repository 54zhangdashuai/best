# 故障分析与修复报告

**日期**: 2026-01-15
**报告人**: 首席技术顾问
**问题描述**: 
1. 管理员页面输入正确密码 "54zds" 提示 "密码错误"。
2. 投票页面显示 "error: failed to fetch programs"。
3. 大屏显示无数据。

## 1. 核心原因分析 (Root Cause Analysis)

### 1.1 "密码错误" 的误导性提示
经过代码审计，发现前端 `App.tsx` 中的登录逻辑存在缺陷：
```typescript
try {
  await api.login(password);
} catch (err) {
  alert('密码错误'); // 无论什么错误（包括网络断开、服务器崩溃）都提示密码错误
}
```
这意味着，**您遇到的很可能不是密码错误**，而是**服务器无法连接**（Network Error）或 **API 返回了 500/502 错误**。代码逻辑掩盖了真实的故障原因。

**修复**: 已修改 `App.tsx`，现在会区分显示 "密码错误" 和 "连接服务器失败: [具体原因]"。

### 1.2 "Failed to fetch programs" 与大屏空白
这两个现象共同指向一个问题：**前端无法从后端 API 获取数据**。
可能的故障点如下：
1.  **后端容器崩溃 (Backend Crash)**: `nebulavote-backend` 容器可能启动失败（例如数据库权限问题）。
2.  **Nginx 代理失效**: Nginx 可能没能正确将 `/api` 请求转发给后端。
3.  **数据库未初始化**: 虽然代码有自动初始化逻辑，但如果挂载卷权限不对，可能导致初始化失败。

## 2. 已执行的修复 (Fixes Implemented)

1.  **前端错误处理优化**: 
    *   `App.tsx`: 登录失败时，如果是网络问题，明确提示 "连接服务器失败"。
    *   `App.tsx`: 投票/大屏页加载失败时，显示详细错误信息并提供 "重试" 按钮。
2.  **后端安全性加固 (顺带修复)**:
    *   确认并修复了管理端 `reset` 和 `delete` 接口的鉴权中间件，防止未授权访问。

## 3. 服务器端排查步骤 (Action Required)

请在服务器 (`ubuntu@122.51.60.20`) 上执行以下操作以彻底解决连接问题：

### 第一步：更新代码并重新部署
由于我刚刚修复了代码，请先同步最新版本：
```bash
cd /path/to/project/best  # 进入你的项目目录
git pull
sudo docker-compose down
sudo docker-compose up -d --build
```

### 第二步：检查容器状态
如果重新部署后问题依旧，请运行：
```bash
sudo docker ps
```
*   **正常情况**: 应看到 `nebulavote-frontend` 和 `nebulavote-backend` 状态均为 `Up`。
*   **异常情况**: 如果 backend 没在列表中，或状态是 `Restarting`，说明后端挂了。

### 第三步：查看后端日志 (关键)
如果后端挂了，查看报错信息：
```bash
sudo docker logs nebulavote-backend
```
*   **常见错误**: `SQLITE_CANTOPEN: unable to open database file`
    *   **解决**: 检查 `backend/data` 目录权限: `chmod 777 backend/data`

### 第四步：验证 API
在服务器上直接测试后端端口：
```bash
curl http://localhost:3000/api/programs
```
*   如果返回 JSON 数据，说明后端正常，问题出在 Nginx。
*   如果连接被拒绝，说明后端没起来。

---
**总结**: 代码层面的误导已修复。请按照上述步骤在服务器上更新并排查容器状态。
