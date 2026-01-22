# 03. 核心逻辑流 (Core Logic Flow)

## 1. 程序启动与路由流程 (Startup & Routing)

前端应用从 `index.tsx` 启动，挂载 `App` 组件。`App.tsx` 内部集成了路由逻辑，根据 URL 分发到不同的业务页面。

```mermaid
flowchart TD
    Entry([index.tsx 入口]) --> Mount[挂载 App 组件]
    Mount --> Router{路由分发}
    
    Router -->|/vote 或 /| VotePage[大众投票页]
    Router -->|/leaderboard| BoardPage[实时排行榜]
    Router -->|/admin| AdminPage[管理后台]
    
    VotePage -->|初始化| FetchData1[获取节目列表 & 配置]
    BoardPage -->|初始化| PollLoop[启动 2s 轮询]
    AdminPage -->|初始化| AuthCheck[登录验证]
```

## 2. 核心业务流程详解

### 2.1 投票流程 (Voting Process)

用户在投票页选择心仪的节目并提交。

```mermaid
sequenceDiagram
    participant User as 用户
    participant Client as 前端 (VotingPage)
    participant API as 后端 API (/api/vote)
    participant DB as SQLite 数据库

    User->>Client: 选择节目并点击“投票”
    Client->>Client: 检查本地 ClientID (localStorage)
    Client->>API: POST /api/vote (programIds, clientId)
    
    Note over API: 验证阶段
    API->>DB: 查询系统配置 (Settings)
    DB-->>API: 返回限制规则 (limit, enabled)
    
    alt 投票通道关闭 或 票数不符
        API-->>Client: 403/400 Error
        Client-->>User: 显示错误提示
    else 验证通过
        API->>DB: 查询是否重复投票 (Check IP/ID)
        alt 已存在记录
            API-->>Client: 403 "您已经投过票了"
        else 无记录
            Note over API: 事务执行
            API->>DB: BEGIN TRANSACTION
            API->>DB: INSERT into vote_records
            API->>DB: UPDATE programs set vote_count++
            API->>DB: COMMIT
            API-->>Client: 200 OK
            Client-->>User: 显示“投票成功”
        end
    end
```

### 2.2 排行榜实时刷新流程 (Leaderboard Polling)

大屏幕通过轮询机制保持数据实时性。

```mermaid
sequenceDiagram
    participant Screen as 大屏前端
    participant API as 后端 API
    participant DB as SQLite 数据库

    loop 每 2 秒 (setInterval)
        Screen->>API: GET /api/programs
        API->>DB: SELECT * FROM programs
        DB-->>API: 返回节目列表及票数
        API-->>Screen: JSON Data
        
        Note over Screen: 前端计算排名
        Screen->>Screen: Sort by votes (DESC)
        Screen->>Screen: 计算总票数
        Screen->>Screen: 对比上一轮排名 (计算升降趋势)
        Screen->>Screen: 更新 UI 动画
    end
```

## 3. 关键分支与状态跳转

1.  **权限控制 (App.tsx / server.ts)**
    *   **投票开关**: `settings.voting_enabled` 控制全局投票功能。若为 `false`，API 直接拒绝投票请求。
    *   **管理员鉴权**: 后端硬编码验证密码。前端通过 `isAuthenticated` 状态控制显示登录页还是管理面板。

2.  **数据一致性 (server.ts)**
    *   **事务保障**: 投票操作（写入记录 + 更新票数）被包裹在 `db.serialize` 和 `BEGIN TRANSACTION` ... `COMMIT` 中，确保数据原子性。
    *   **防刷机制**: 双重验证——优先使用 `clientId` (LocalStorage)，兜底使用 `req.ip`。
