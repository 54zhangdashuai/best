# 05. 质量与风险报告 (Code Quality Report)

## 1. 死代码与冗余文件检测 (Dead Code Detection)

| 文件/代码块 | 类型 | 状态 | 说明 |
| :--- | :--- | :--- | :--- |
| `daemon_config_fix.json` | 文件 | **待人工确认** | 根目录下的孤立 JSON，疑似配置碎片，未被任何代码引用。 |
| `metadata.json` | 文件 | **待人工确认** | 仅包含描述信息，未见构建脚本使用此文件。 |
| `types.ts` -> `SimulationConfig` | 接口 | AI检测 | 定义了 `SimulationConfig` 接口但未在主要业务逻辑中发现引用。 |

## 2. 硬编码警告 (Hardcoded Values & Magic Numbers)

### 严重安全风险
*   **[backend/src/server.ts:147](file:///d:/project/best/backend/src/server.ts#L147)**: 管理员密码直接硬编码为字符串 `'54zds'`。
    *   *建议*: 必须移至环境变量 (`.env`) 或数据库存储，并使用哈希比对。
*   **[backend/src/server.ts:23](file:///d:/project/best/backend/src/server.ts#L23)**: 鉴权 Token 硬编码为 `'admin-token-mock'`。
    *   *建议*: 使用 JWT 或真实 Session 机制。

### 配置硬编码
*   **[backend/src/server.ts:7](file:///d:/project/best/backend/src/server.ts#L7)**: 端口号 `3000`。
*   **[backend/src/db.ts:53-60](file:///d:/project/best/backend/src/db.ts#L53-60)**: 数据库初始化时写入了硬编码的初始节目列表（"星辰大海"等）。
    *   *建议*: 提取为独立的 `seed.ts` 脚本或配置文件。
*   **[App.tsx:117](file:///d:/project/best/App.tsx#L117)**: 轮询间隔 `2000` (ms)。
    *   *建议*: 定义为常量 `POLL_INTERVAL`。

## 3. 代码复杂度与重构建议 (Refactoring Suggestions)

### 1. 组件拆分 (`App.tsx`)
*   **现状**: `App.tsx` 不仅包含路由定义，还定义了 `VotingPage`, `LeaderboardPage`, `AdminPage` 三个完整的页面组件，导致文件职责过重，逻辑混合。
*   **建议**: 将这三个页面组件拆分到 `src/pages/` 目录下（如 `src/pages/VotingPage.tsx`）。

### 2. 后端路由分离 (`backend/src/server.ts`)
*   **现状**: 所有 API 路由处理逻辑（数据库查询、业务校验）都直接写在 `server.ts` 的回调函数中。
*   **建议**: 采用 MVC 分层结构。
    *   创建 `routes/` 存放路由定义。
    *   创建 `controllers/` 存放业务逻辑。
    *   `server.ts` 仅负责启动服务和挂载中间件。

### 3. 类型定义统一
*   **现状**: 前端 `types.ts` 定义了 `Candidate`，但后端直接使用 `any` 或未定义的类型操作数据库结果。
*   **建议**: 使用共享的类型定义库（Shared Types），确保前后端数据接口定义一致。
