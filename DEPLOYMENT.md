# 部署文档

## 架构概览

```
Client (RN App)
  → Nginx (80/443)
    → API Gateway (4000)
      → auth-service (4006)
      → user-service (4001)
      → product-service (4002)
      → order-service (4003)
      → mq-service (4004)
      → search-service (4005)
    → MySQL (3306)
    → Redis (6379)
```

## 前提条件

- Docker Desktop 已安装并运行
- 端口 3306、4000-4006、6379、80、443 未被占用

## 一键启动

```powershell
cd C:\GitHub\仿京东淘宝网全栈开发

# 构建并启动全部服务
docker compose -p ecommerce up -d --build

# 等待 MySQL 初始化（约15秒）
Start-Sleep -Seconds 15

# 导入测试数据
cmd /c "docker exec -i ecommerce-mysql mysql -uroot -proot ecommerce < database\seed.sql"
```

## 验证部署

```powershell
# 查看容器状态（全部 Healthy 为正常）
docker compose -p ecommerce ps

# 健康检查
Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -UseBasicParsing
```

预期返回：
```json
{
  "success": true,
  "code": "OK",
  "message": "所有服务正常",
  "data": { "gateway": "healthy", "services": { ... } }
}
```

## 数据库迁移（已有库升级）

```powershell
# 如果已有数据库需要新增字段
cmd /c "docker exec -i ecommerce-mysql mysql -uroot -proot ecommerce < database\migrate_v2.sql"
```

## 服务端口

| 服务 | 端口 | 说明 | 对外 |
|------|------|------|------|
| Nginx | 80 / 443 | 反向代理 | ✅ |
| API Gateway | 4000 | 统一入口 | ✅ |
| Auth Service | 4006 | 认证服务 | ❌ |
| User Service | 4001 | 用户服务 | ❌ |
| Product Service | 4002 | 商品服务 | ❌ |
| Order Service | 4003 | 订单服务 | ❌ |
| MQ Service | 4004 | 消息服务 | ❌ |
| Search Service | 4005 | 搜索服务 | ❌ |
| MySQL | 3306 | 数据库 | ❌ |
| Redis | 6379 | 缓存 | ❌ |

> 生产环境微服务端口不暴露，只有 Nginx + Gateway 对外。

## 常用命令

```powershell
# 查看日志
docker compose -p ecommerce logs -f
docker compose -p ecommerce logs -f gateway
docker compose -p ecommerce logs -f auth-service

# 重启单个服务
docker compose -p ecommerce restart gateway

# 停止所有服务
docker compose -p ecommerce down

# 停止并删除卷（慎用，会清空数据库）
docker compose -p ecommerce down -v
```

## 环境变量

### Gateway
```
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=https://your-domain.com
```

### 短信配置
```
SMS_PROVIDER=console      # console / aliyun / tencent
SMS_CODE_EXPIRE=300       # 验证码过期时间（秒）
SMS_COOLDOWN=60           # 同号冷却时间（秒）
SMS_IP_LIMIT=20           # 同IP每日上限
SMS_PHONE_LIMIT=10        # 同手机号每日上限
```

### 微信小程序
```
WX_APP_ID=your_wx_app_id
WX_SECRET=your_wx_secret
```

## 故障排查

### 服务无法启动
```powershell
docker compose -p ecommerce ps
docker compose -p ecommerce logs --tail=50 gateway
```

### 常见问题
1. **端口被占用** - 杀掉占用进程后重启：`docker compose -p ecommerce up -d`
2. **MySQL 未就绪** - 等待 15 秒以上再导入数据
3. **构建失败（EOF）** - 清理缓存：`docker builder prune -af` 后重新构建
4. **返回 503** - 正常现象，表示部分下游服务未启动
5. **uuid ESM 错误** - 确认 gateway 依赖为 `uuid@9`：`cd backend/microservices/gateway && npm install uuid@9`

## 生产部署建议

- [ ] 使用独立 MySQL + Redis 实例
- [ ] JWT Secret 替换为强随机值
- [ ] Nginx 配置 SSL 证书
- [ ] 静态资源迁移到 OSS/CDN
- [ ] 开启统一日志采集与告警
- [ ] 按 `PRODUCTION_CHECKLIST.md` 逐项核对
