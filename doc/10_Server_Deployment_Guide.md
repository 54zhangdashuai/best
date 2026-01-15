# 服务器部署指南 (Ubuntu 22.04 LTS)

## 1. 准备工作

### 1.1 获取代码
使用 Git 将代码拉取到服务器（假设您已将代码提交到 Git 仓库）：

```bash
# 登录服务器
ssh ubuntu@122.51.60.20

# 首次拉取 (如果使用 HTTPS)
git clone <您的Git仓库地址> best-vote
cd best-vote

# 或者如果已有代码，更新代码
cd best-vote
git pull
```

### 1.2 确保 Docker 环境
服务器已安装 Docker (如未安装请先安装):
```bash
docker --version
docker-compose --version
```

## 2. 部署与启动

我们使用 Docker Compose 一键启动所有服务 (Nginx + 前端静态资源 + Node.js 后端)。

```bash
# 在项目根目录下执行
# -d 表示后台运行
# --build 表示重新构建镜像 (确保代码更新生效)
sudo docker-compose up -d --build
```

### 检查运行状态
```bash
sudo docker-compose ps
```
如果一切正常，您应该看到 `frontend` 和 `backend` 容器都处于 `Up` 状态。

## 3. 访问地址

系统部署在 IP: `122.51.60.20`，默认开放 `80` 端口 (HTTP)。

- **用户投票 (手机端)**:  
  [http://122.51.60.20/vote](http://122.51.60.20/vote)  
  *(请将此链接生成二维码发给同事)*

- **大屏展示 (投屏电脑)**:  
  [http://122.51.60.20/leaderboard](http://122.51.60.20/leaderboard)

- **后台管理 (管理员)**:  
  [http://122.51.60.20/admin](http://122.51.60.20/admin)  
  *密码: 54zds*

## 4. 常见问题与维护

### 4.1 无法访问?
请检查腾讯云控制台的 **安全组 (Security Group)** 设置，确保 **入站规则** 中已开放 `TCP:80` 端口。

### 4.2 投票限制与重置
- **一人一票**: 系统通过浏览器缓存 (LocalStorage) + IP 双重校验。
- **重置投票**: 在管理后台点击“重置数据”后，所有历史票数清零。**注意**: 重置后，之前投过票的用户**可以再次投票** (因为数据库记录已清除)。

### 4.3 查看日志
如果遇到报错，可以查看后台日志：
```bash
# 查看后端日志
sudo docker-compose logs -f backend

# 查看前端/Nginx日志
sudo docker-compose logs -f frontend
```

### 4.4 停止服务
```bash
sudo docker-compose down
```
