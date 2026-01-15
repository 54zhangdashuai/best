# 测试方案

## 1. 单元与接口测试 (API Testing)
在后端开发完成后进行。

| 用例ID | 测试内容 | 前置条件 | 操作步骤 | 预期结果 |
| :--- | :--- | :--- | :--- | :--- |
| T-API-01 | 获取节目列表 | 数据库已初始化 | GET `/api/programs` | 返回 200 OK，包含节目数据及 `vote_count_limit` |
| T-API-02 | 正常投票 | 规则设为2票 | POST `/api/vote` {programIds:[1,2]} | 返回 200 OK，message: "投票成功" |
| T-API-02-B | 投票数量不符 | 规则设为2票 | POST `/api/vote` {programIds:[1]} | 返回错误，提示需投2票 |
| T-API-03 | 重复投票 | 同IP已投过 | 再次 POST `/api/vote` | 返回非 0 状态码，message 提示已投票 |
| T-API-04 | 管理员鉴权 | 无 | POST `/api/admin/reset` (无Header) | 返回 401 Unauthorized |
| T-API-05 | 密码登录 | 无 | POST `/api/login` {"password":"wrong"} | 返回 403/401 密码错误 |
| T-API-06 | 修改规则 | 管理员登录 | POST `/api/admin/settings` {vote_count_limit:3} | 返回成功，后续 GET `/programs` 看到 limit 变更为 3 |

## 2. 前端功能测试 (Functional Testing)
在前端对接完成后进行。

| 用例ID | 测试内容 | 场景 | 操作步骤 | 预期结果 |
| :--- | :--- | :--- | :--- | :--- |
| T-UI-01 | 手机端列表渲染 | 首页 | 打开 `/vote` | 正确显示所有节目，进入多选模式 |
| T-UI-02 | 手机端少选校验 | 首页 | 规则设为3，仅选1个，点提交 | 弹出提示“请选择3个节目” |
| T-UI-03 | 手机端正常投票 | 首页 | 选中3个，点提交 | 弹出成功提示，按钮锁定 |
| T-UI-04 | 大屏自动刷新 | 大屏页 | 打开 `/screen`，另一设备投票 | 2秒内大屏票数自动增加，无需手动刷新 |
| T-UI-04 | 管理端登录 | 管理页 | 打开 `/admin` | 默认显示登录框，输入 `54zds` 后进入管理面板 |
| T-UI-05 | 数据重置 | 管理页 | 点击“重置数据” | 所有端（包括大屏）在下一轮刷新后票数归零 |

## 3. 部署验证测试 (Deployment Testing)
在 Docker 环境启动后进行。

| 用例ID | 测试内容 | 操作步骤 | 预期结果 |
| :--- | :--- | :--- | :--- |
| T-DEP-01 | 容器启动 | `docker-compose up` | 无报错，前端后端容器均为 Up 状态 |
| T-DEP-02 | 数据持久化 | 投几票 -> 重启容器 -> 刷新页面 | 票数依然存在，未丢失 |
| T-DEP-03 | 跨域访问 | 访问 `localhost:80` 调用 API | Nginx 正确代理请求到后端，无 CORS 错误 |
