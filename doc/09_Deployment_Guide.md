# Deployment Guide (部署指南)

**System Name**: 是为科技年会最佳节目实时投票系统
**Project Structure**: Frontend (React/Vite) + Backend (Express/SQLite) + Docker

---

## Part 1: Local Deployment (本地部署)

Suitable for development and testing on your local machine (Windows/Mac/Linux).

### 1. Prerequisites (准备工作)
- **Docker Desktop**: Ensure Docker Desktop is installed and running.
- **Git**: Ensure Git is installed.

### 2. Deployment Steps (部署步骤)

#### Step 1: Clone Repository
```bash
git clone <your-repo-url> best
cd best
```

#### Step 2: Start Services
Use Docker Compose to build and start both frontend and backend services.
```bash
docker-compose up -d --build
```

#### Step 3: Verify Deployment
Check if containers are running:
```bash
docker ps
```
You should see `nebulavote-frontend` and `nebulavote-backend`.

### 3. Access Addresses (本地访问地址)

| Role | URL | Note |
| :--- | :--- | :--- |
| **Mobile Voting** | `http://localhost/vote` | 模拟手机端访问 |
| **Big Screen** | `http://localhost/leaderboard` | 模拟大屏展示 |
| **Admin Panel** | `http://localhost/admin` | 密码: `54zds` |

> **Note**: If port 80 is occupied on your local machine, you may need to modify `docker-compose.yml` to map to a different port (e.g., `8080:80`) and access via `http://localhost:8080/...`.

---

## Part 2: Server Deployment (服务器部署)

Target Server: Tencent Cloud Ubuntu 22.04 LTS
Server IP: `122.51.60.20`

### 1. Prerequisites (准备工作)
Ensure Docker and Git are installed on the server.
```bash
sudo apt update
sudo apt install git docker.io docker-compose -y
```

### 2. Deployment Steps (部署步骤)

#### Step 1: Clone/Pull Repository
```bash
# First time setup
git clone <your-repo-url> best
cd best

# Or if already cloned (Updating code)
cd best
git pull
```

#### Step 2: Build and Start Services
IMPORTANT: Whenever you update the code, you must rebuild the containers to apply changes (especially for the backend TypeScript compilation).
```bash
# Stop existing containers (optional but recommended for clean restart)
sudo docker-compose down

# Build and start in detached mode
sudo docker-compose up -d --build
```

#### Step 3: Verify Deployment
Check if containers are running:
```bash
sudo docker ps
```
You should see `nebulavote-frontend` (Port 80) and `nebulavote-backend` (Port 3000).

### 3. Access Addresses (服务器访问地址)

| Role | URL | Note |
| :--- | :--- | :--- |
| **Mobile Voting** | `http://122.51.60.20/vote` | 发送给员工的链接 |
| **Big Screen** | `http://122.51.60.20/leaderboard` | 投屏使用 |
| **Admin Panel** | `http://122.51.60.20/admin` | 密码: `54zds` |

---

## Part 3: Feature Guide (功能说明)

### 1. Admin Control (后台管理)
Login to `http://<ip>/admin` to manage the system.

- **Stop/Start Voting (停止/开始投票)**: 
  - Located in the "System Settings" (系统设置) panel.
  - Clicking "Stop Voting" (停止投票) will immediately disable the voting interface for all users.
  - Users will see a red banner "投票通道已暂时关闭" (Voting Closed) and cannot submit votes.
  - Clicking "Start Voting" (开始投票) will re-enable voting.
  
- **Reset Data (重置数据)**:
  - Clicking "Reset Data" (重置数据) will clear all votes and reset vote counts to zero.
  - **Note**: Resetting data will automatically re-enable voting (set to "Start" state).

- **Vote Limit (投票限制)**:
  - You can set how many programs a user must select (e.g., Select exactly 3 programs).

### 2. Voting Page (投票页)
- Users open the link, select the required number of programs, and click submit.
- If voting is stopped by admin, the interface becomes read-only with a visual warning.

---

## Part 4: Performance Tuning (性能与并发调优)

本节面向“1 台大屏 + 300 人同时访问投票页并集中投票”的生产场景，给出最小改动的稳定性方案：**用 Nginx 微缓存吸收读压 + 用限流/超时保护写入**。

### 1. Nginx 微缓存（推荐上线默认开启）
目标：将 300 人对 `GET /api/programs` 的高频轮询合并为少量回源请求，避免后端出现 5xx。

建议策略：
*   **仅缓存**：`GET /api/programs`
*   **缓存 TTL**：0.5s～1s
*   **失败兜底**：上游短暂失败时返回旧缓存（stale），优先保证可用性与大屏连续刷新

### 2. 写入保护（投票爆发窗口）
目标：投票爆发时“允许排队但不失败”，并避免异常流量将写接口打爆。

建议策略：
*   **限流**：对 `POST /api/vote` 设置速率限制 + 突发放行（注意公司内网 NAT 共用 IP 的误伤风险，burst 值要留足）。
*   **超时**：设置合理的上游超时（不要过短），避免投票在数据库排队时被网关提前 504。
*   **错误码**：限流返回 429；业务拒绝返回 400/403；后端错误返回 500（并在日志中区分上游失败与应用错误）。

### 3. 观测与定位（上线必备）
建议在 Nginx access log 中记录：
*   `$status`、`$upstream_status`
*   `$request_time`、`$upstream_response_time`
*   `$http_user_agent`、`$remote_addr`

建议在后端日志中区分记录：
*   `GET /api/programs` 的响应耗时与状态码
*   `POST /api/vote` 的响应耗时与失败原因（特别是 SQLite busy/超时类错误）
