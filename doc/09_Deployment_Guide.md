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
