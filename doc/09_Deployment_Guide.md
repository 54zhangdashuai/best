# 部署指南 (Deployment Guide)

## 1. 环境要求
- 服务器系统：Ubuntu 22.04 LTS (推荐)
- 软件依赖：Docker, Docker Compose
- 端口要求：
  - 80 (HTTP) - 前端访问
  - 3000 (API) - 后端服务 (仅内部或通过 Nginx 代理访问)

## 2. 部署步骤

### 第一步：克隆代码到服务器
```bash
git clone <your-repo-url>
cd <project-folder>
```

### 第二步：启动服务
使用 Docker Compose 一键启动所有服务：
```bash
docker-compose up -d --build
```

此命令将：
1. 构建后端镜像 (nebulavote-backend) 并启动容器。
2. 构建前端镜像 (nebulavote-frontend) 并启动容器。
3. 自动配置 Nginx 反向代理。

### 第三步：验证部署
- **用户投票端**：访问 `http://<服务器IP>/vote`
- **大屏展示端**：访问 `http://<服务器IP>/leaderboard`
- **管理后台**：访问 `http://<服务器IP>/admin` (默认密码: 54zds)

## 3. 数据持久化
- 数据库文件存储在 `./backend/data/database.sqlite`。
- 该目录已挂载到 Docker 容器中，重启容器不会丢失数据。
- 若要重置数据，可在管理后台点击“重置数据”按钮。

## 4. 常见问题排查

### 无法访问前端页面
- 检查服务器防火墙是否放行 80 端口。
- 检查容器状态：`docker-compose ps`

### API 请求失败
- 检查后端容器是否正常运行。
- 查看后端日志：`docker-compose logs backend`

### 修改配置后不生效
- 如果修改了代码，需要重新构建镜像：
  ```bash
  docker-compose down
  docker-compose up -d --build
  ```
