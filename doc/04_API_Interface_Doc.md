# API 接口文档

**Base URL**: `/api`
**Content-Type**: `application/json`

## 1. 公共接口 (Public)

### 1.1 获取节目列表 & 系统配置
获取所有节目及其当前票数，同时返回投票规则。

*   **URL**: `GET /programs`
*   **Response**:
    ```json
    {
      "code": 0,
      "data": {
        "programs": [
          { "id": 1, "title": "开场舞", "vote_count": 120 },
          { "id": 2, "title": "歌曲独唱", "vote_count": 85 }
        ],
        "config": {
          "vote_count_limit": 3 // 必须投几票
        }
      }
    }
    ```

### 1.2 提交投票
用户对节目进行批量投票。

*   **URL**: `POST /vote`
*   **Body**:
    ```json
    {
      "programIds": [1, 2, 3]
    }
    ```
*   **Response (Success)**:
    ```json
    { "code": 0, "message": "投票成功" }
    ```
*   **Response (Error)**:
    ```json
    { "code": 1002, "message": "请选择 3 个节目进行投票" }
    ```
*   **Response (Error)**:
    ```json
    { "code": 1001, "message": "您已经投过票了" }
    ```

### 1.3 管理员登录
验证密码并获取管理 Token。

*   **URL**: `POST /login`
*   **Body**:
    ```json
    {
      "password": "54zds"
    }
    ```
*   **Response**:
    ```json
    {
      "code": 0,
      "token": "admin-token-example-123" 
    }
    ```

## 2. 管理端接口 (Admin Only)
**Headers**: `Authorization: Bearer <token>`

### 2.1 添加节目
*   **URL**: `POST /admin/programs`
*   **Body**:
    ```json
    { "title": "新节目名称" }
    ```
*   **Response**:
    ```json
    { "code": 0, "data": { "id": 5, "title": "新节目名称", "vote_count": 0 } }
    ```

### 2.2 删除节目
*   **URL**: `DELETE /admin/programs/:id`
*   **Response**:
    ```json
    { "code": 0, "message": "删除成功" }
    ```

### 2.3 设置投票规则
*   **URL**: `POST /admin/settings`
*   **Body**:
    ```json
    { "vote_count_limit": 3 }
    ```
*   **Response**:
    ```json
    { "code": 0, "message": "规则已更新" }
    ```

### 2.4 重置系统
清空所有投票数据，将所有节目的 `vote_count` 重置为 0。

*   **URL**: `POST /admin/reset`
*   **Body**: `{}`
*   **Response**:
    ```json
    { "code": 0, "message": "系统数据已重置" }
    ```
