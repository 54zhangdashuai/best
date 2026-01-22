# 04. 全局变量与数据结构分析 (Global State Analysis)

## 1. 全局变量清单 (Global Variables List)

### 后端 (Backend)

| 变量名 | 定义位置 | 读/写 (R/W) | 说明 | 风险等级 |
| :--- | :--- | :--- | :--- | :--- |
| `db` | `backend/src/db.ts` | **R/W** (全局单例) | SQLite 数据库连接实例。被 `server.ts` 用于所有数据库操作。 | 中 - 单例模式在简单的 Express 应用中可接受，但在高并发下可能成为瓶颈。 |
| `PORT` | `backend/src/server.ts` | **R** | 硬编码端口 `3000`。 | 低 - 建议移至环境变量。 |
| `password` | `backend/src/server.ts` | **R** (API) | 硬编码管理员密码 `'54zds'`。 | **高** - 安全风险。 |

### 前端 (Frontend)

| 变量名/Key | 存储位置 | 作用域 | 说明 |
| :--- | :--- | :--- | :--- |
| `vote_client_id` | `localStorage` | 浏览器端 | 唯一标识客户端，用于防刷票。若用户清除缓存可重置。 |
| `api` | `client.ts` | 模块导出 | 封装后的 API 客户端单例对象。 |

---

## 2. 核心数据结构 (Core Data Structures)

### 2.1 数据库 Schema (SQLite)

这是系统的单一事实来源 (Single Source of Truth)。

#### 1. `programs` (节目/选手表)
*核心业务表，存储所有候选项。*

| 字段名 | 类型 | 含义 |
| :--- | :--- | :--- |
| `id` | INTEGER | 主键，自增 ID。 |
| `title` | TEXT | 节目名称。 |
| `performer` | TEXT | 表演者/选手姓名。 |
| `vote_count` | INTEGER | **关键状态** - 当前累计总票数。 |
| `color` | TEXT | 显示颜色 (Hex Code)。 |

#### 2. `settings` (系统配置表)
*Key-Value 存储，用于动态控制系统行为。*

| 字段名 | 类型 | 含义 |
| :--- | :--- | :--- |
| `key` | TEXT | 配置项键名 (如 `vote_count_limit`, `voting_enabled`)。 |
| `value` | TEXT | 配置值 (字符串存储，使用时需转换)。 |

#### 3. `vote_records` (投票流水表)
*用于审计和防刷票验证。*

| 字段名 | 类型 | 含义 |
| :--- | :--- | :--- |
| `client_ip` | TEXT | 客户端标识 (IP 或 ClientID)。**索引字段**，用于快速查重。 |
| `program_id` | INTEGER | 投给的目标节目 ID。 |

### 2.2 前端模型 (TypeScript Interfaces)

#### `Candidate` Interface (`types.ts`)
前端用于渲染 UI 的主要数据模型，部分字段由前端实时计算。

```typescript
interface Candidate {
  id: string;        // 对应 DB programs.id
  name: string;      // 对应 DB programs.performer
  handle: string;    // 对应 DB programs.title
  votes: number;     // 对应 DB programs.vote_count
  color: string;
  // 以下为前端计算字段 (Runtime Computed)
  previousRank: number; // 上一轮排名，用于计算动画位移
  currentRank: number;  // 当前排名
}
```
