# NebulaVote - 实时现场投票系统

本项目是一个基于 Docker 容器化的全栈实时投票系统，专为年会、比赛、表演等活动现场设计。支持手机端扫码投票、大屏实时展示排名、后台管理数据等功能。

## 🌟 核心功能

1. **大众投票端 (Mobile)**
   * **入口**: `/vote`
   * **功能**: 响应式设计适配手机浏览器；支持多选/单选限制；基于 IP 和设备指纹的防刷机制；倒计时自动锁定。
2. **实时大屏端 (Screen)**
   * **入口**: `/screen` (原 `/leaderboard`)
   * **功能**: 专为投影仪/LED大屏设计；每 2 秒自动轮询更新；动态展示票数变化和排名升降动画。
3. **管理后台 (Admin)**
   * **入口**: `/admin`
   * **功能**: 节目管理（增删改）；一键重置所有票数；控制投票开始/结束。默认密码: `54zds`。

## 🛠 技术栈

* **前端**: React 19 + TypeScript + Vite + TailwindCSS
* **后端**: Node.js + Express + TypeScript
* **数据库**: SQLite 3 (轻量级文件数据库，易于备份)
* **部署**: Docker + Docker Compose + Nginx 反向代理

---

## 🚀 部署指南 (Ubuntu Server)

本指南适用于在新的 Ubuntu 服务器（如腾讯云/阿里云）上使用 Docker 快速部署。

### 1. 环境准备

确保服务器已安装 Docker 和 Git：

```bash
# 更新软件源
sudo apt update

# 安装 Git 和 Docker
sudo apt install git docker.io docker-compose -y

# 启动 Docker 并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 获取代码

```bash
# 克隆项目 (请替换为实际仓库地址)
git clone https://github.com/54zhangdashuai/best

# 进入项目目录
cd best
```

### 3. 启动服务

使用 Docker Compose 一键构建并启动所有服务（前端、后端、数据库、Nginx）：

```bash
# 构建镜像并后台启动
sudo docker compose up -d --build
```

### 4. 验证部署

检查容器是否正常运行：

```bash
sudo docker ps
```

你应该能看到两个容器：

* `nebulavote-frontend`: 映射端口 `0.0.0.0:80->80/tcp`
* `nebulavote-backend`: 映射端口 `0.0.0.0:3000->3000/tcp`

### 5. 访问地址

假设服务器 IP 为 `122.51.60.20`：

* **投票页**: `http://122.51.60.20/vote`
* **大屏页**: `http://122.51.60.20/screen`
* **后台页**: `http://122.51.60.20/admin`

> **注意**: 数据库文件位于 `backend/data/database.sqlite`。Docker 会将宿主机的 `./backend/data` 目录挂载到容器内，确保数据持久化。

---

## 🧪 测试方法

我们提供了多种测试手段来验证系统的稳定性和高并发承载能力。

### 1. 手动功能验证

* **倒计时测试**: 在后台设置倒计时，观察前端是否每秒递减并在结束后锁定提交按钮。
* **数据同步**: 用手机投票，观察大屏页面是否在 2 秒内自动刷新票数。

### 2. 自动化负载测试 (Load Testing)

本项目包含完整的 **k6** 压测脚本，用于模拟高并发场景。

#### 准备工作

请在本地或测试机上安装 k6：

* **Windows**: `choco install k6` 或下载安装包
* **Mac**: `brew install k6`
* **Ubuntu**:
  ```bash
  sudo gpg -k
  sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
  echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
  sudo apt-get update
  sudo apt-get install k6
  ```

#### 可用测试脚本

脚本位于 `tests/load/` 目录下：

1. **300人波峰测试 (分批次写入)**

   * **场景**: 模拟 300 用户在不同时间段分批次进入并投票，模拟真实写库压力。
   * **命令**:
     ```bash
     k6 run tests/load/k6_realistic_screen_vote_300users_waves.js
     ```
2. **1000人高并发测试 (异步写入)**

   * **场景**: 模拟 1000 用户在 30 秒内随机时间点投票，验证系统在高并发下的稳定性及大屏刷新的流畅度。
   * **命令**:
     ```bash
     k6 run tests/load/k6_1000users_30s_async_writes.js
     ```

### 3. 常见问题排查

如果遇到 `SQLITE_CANTOPEN` 错误，通常是权限问题。请在服务器上执行：

```bash
chmod -R 777 backend/data
sudo docker-compose restart backend
```
