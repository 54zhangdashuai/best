# 数据库设计文档

**数据库类型**：SQLite
**文件名**：`vote_system.db`

## 1. 实体关系图 (ER Diagram)

系统非常简单，主要包含两个核心实体：`Program` (节目) 和 `VoteRecord` (投票记录)。

```mermaid
erDiagram
    PROGRAM {
        int id PK "自增主键"
        string title "节目名称"
        int vote_count "当前票数缓存"
        datetime created_at
    }
    VOTE_RECORD {
        int id PK
        int program_id FK "关联节目ID"
        string client_ip "投票者IP"
        string device_id "设备指纹(可选)"
        datetime voted_at
    }
    PROGRAM ||--o{ VOTE_RECORD : has

## 2. 数据表定义

### 2.0 系统配置表 (settings)
用于存储全局配置，如投票规则。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| key | TEXT | PRIMARY KEY | 配置项键名 (e.g., 'vote_count_limit') |
| value | TEXT | NOT NULL | 配置项值 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### 2.1 节目表 (programs)
用于存储参与投票的节目信息。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 节目ID |
| title | TEXT | NOT NULL | 节目名称 |
| vote_count | INTEGER | DEFAULT 0 | 冗余字段，用于快速读取票数 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

### 2.2 投票记录表 (vote_records)
用于存储每一张选票，防止刷票并用于审计。

| 字段名 | 类型 | 约束 | 描述 |
| :--- | :--- | :--- | :--- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 记录ID |
| program_id | INTEGER | NOT NULL | 关联的节目ID |
| client_ip | TEXT | NOT NULL | 客户端IP地址 |
| user_agent | TEXT | NULL | 客户端浏览器信息（辅助排查） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 投票时间 |

**索引建议**：
*   `CREATE INDEX idx_vote_ip ON vote_records(client_ip);` (用于快速查询该 IP 是否已投票)

## 3. 初始化数据 (Seed Data)
系统首次启动时，可预置一些示例数据：

```sql
INSERT INTO settings (key, value) VALUES ('vote_count_limit', '1');

INSERT INTO programs (title, vote_count) VALUES 
('开场舞：龙飞凤舞', 0),
('歌曲：明天会更好', 0),
('小品：职场风云', 0),
('魔术：奇迹时刻', 0);
```
