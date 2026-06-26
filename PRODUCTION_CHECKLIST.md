# 生产上线 Checklist

## 1. 域名与网络
- [ ] API 域名已规划，例如 `api.example.com`
- [ ] 前端访问域名已规划，例如 `www.example.com`
- [ ] 只对外开放 80/443，内部服务端口不暴露到公网
- [ ] 云防火墙/安全组已收敛

## 2. 证书与 HTTPS
- [ ] 已申请正式 SSL 证书
- [ ] `nginx` 已配置证书路径
- [ ] HTTP 已强制跳转 HTTPS
- [ ] HSTS、X-Frame-Options、X-Content-Type-Options 已开启

## 3. API 网关
- [ ] `JWT_SECRET` 已替换为强随机值
- [ ] `CORS_ORIGIN` 已限制为真实前端域名
- [ ] `/api/v1/*` 已作为正式对外前缀
- [ ] `/api/*` 保留兼容，后续可灰度下线
- [ ] 所有错误响应统一为：
  - `success`
  - `code`
  - `message`
  - `requestId`

## 4. 前端配置
- [ ] 生产包使用 `.env.production`
- [ ] `API_BASE_URL` 指向 `https://api.example.com/api/v1`
- [ ] Android/其他平台环境变量已单独验证
- [ ] 前端日志中能看到 `requestId` 便于排障

## 5. Nginx
- [ ] `gzip` 开启
- [ ] `limit_req` 开启
- [ ] `/api/` 反向代理到 `gateway`
- [ ] `/uploads/` 静态资源切到 CDN/OSS
- [ ] 默认路由只返回 JSON，不泄露内部页面

## 6. 数据与依赖
- [ ] 生产数据库已独立，不使用示例 root 密码
- [ ] Redis 已配置密码和持久化策略
- [ ] 数据库备份策略已建立
- [ ] 敏感配置通过环境变量注入，不入库

## 7. 可观测性
- [ ] Gateway 日志包含 `requestId`
- [ ] Nginx 日志包含 `request_id`
- [ ] 健康检查 `/api/v1/health` 可被监控系统调用
- [ ] 服务异常有告警通知

## 8. 上线验证
- [ ] `docker compose` 启动正常
- [ ] `/api/v1/health` 可用
- [ ] 注册/登录流程正常
- [ ] 商品、订单、支付核心链路正常
- [ ] 502/503/504 错误格式符合统一规范
