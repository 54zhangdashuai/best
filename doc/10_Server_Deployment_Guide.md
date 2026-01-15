# Server Deployment Guide (服务器部署指南)

**System Name**: 是为科技年会最佳节目实时投票系统
**Server IP**: 122.51.60.20
**OS**: Ubuntu 22.04 LTS

## 1. Prerequisites (准备工作)

Ensure Docker and Git are installed on the server.
```bash
sudo apt update
sudo apt install git docker.io docker-compose -y
```

## 2. Deployment Steps (部署步骤)

### Step 1: Clone/Pull Repository
```bash
# First time setup
git clone <your-repo-url> best
cd best

# Or if already cloned (Updating)
cd best
git pull
```

### Step 2: Configure Environment
Ensure `docker-compose.yml` and `nginx.conf` are present in the root directory.

### Step 3: Start Services
```bash
# Build and start in detached mode
sudo docker-compose up -d --build
```

### Step 4: Verify Deployment
Check if containers are running:
```bash
sudo docker ps
```
You should see `nebulavote-frontend` (Port 80) and `nebulavote-backend` (Port 3000).

## 3. Access Addresses (访问地址)

| Role | URL | Note |
| :--- | :--- | :--- |
| **Mobile Voting (移动端投票)** | `http://122.51.60.20/vote` | 发送给员工的链接 |
| **Big Screen (大屏展示)** | `http://122.51.60.20/leaderboard` | 投屏使用 |
| **Admin Panel (管理后台)** | `http://122.51.60.20/admin` | 密码: `54zds` |

## 4. Troubleshooting (故障排查)

If you encounter "Password Error" or "Failed to fetch programs":

1.  **Check Backend Logs**:
    ```bash
    sudo docker logs nebulavote-backend
    ```
    Look for database errors or crash logs.

2.  **Check Permissions**:
    If you see SQLite permission errors, fix the data directory permissions:
    ```bash
    # On the host machine
    chmod -R 777 backend/data
    sudo docker-compose restart backend
    ```

3.  **Check Nginx**:
    Verify Nginx is proxying `/api` correctly:
    ```bash
    sudo docker logs nebulavote-frontend
    ```
