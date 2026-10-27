# Accounts 服务

账户服务保存玩家账号。现在提供注册：`POST /api/accounts/register`，请求体为 JSON `{username, password, email}`。

- 用户名 3–20 位英文字母、数字或下划线，邮箱和用户名都不区分大小写、不可重复。
- 密码以 scrypt 加盐哈希保存。
- 邮件服务尚未接入，邮箱以未验证状态写入，注册不需要验证码。
- 每个客户端地址 10 分钟内最多尝试 10 次。

需要 Node.js 22.13 或更新版本，使用内置的 `node:sqlite`，没有其他依赖：

```sh
npm test
npm start
```

| 变量 | 默认值 | 作用 |
| --- | --- | --- |
| `EAGLER_ACCOUNTS_HOST` | `127.0.0.1` | 监听地址 |
| `EAGLER_ACCOUNTS_PORT` | `18143` | 监听端口 |
| `EAGLER_ACCOUNTS_DATABASE` | `data/accounts.db` | SQLite 数据库文件 |
| `EAGLER_ACCOUNTS_TRUSTED_PROXIES` | `127.0.0.1,::1` | 可信反向代理；经它们转发的请求按 `CF-Connecting-IP` 或 `X-Forwarded-For` 识别客户端 |

网站把 `/api/` 反向代理到本服务。本地开发时给开发服务器设置 `EAGLER_ACCOUNTS_URL=http://127.0.0.1:18143`。`deploy/eagler-accounts.service` 是 systemd 样例。
