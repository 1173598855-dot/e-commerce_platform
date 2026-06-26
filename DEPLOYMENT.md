# 部署文档

## 快速部署

### 前提条件

- Docker Desktop 已安装并运行
- 端口 3306、4000-4006、6379、8080 未被占用

### 一键启动

```powershell
cd e-commerce_platform

# 构建并启动所有服务
docker compose -p ecommerce up -d --build

# 等待 MySQL 初始化（约15秒）
Start-Sleep -Seconds 15

# 导入测试数据
cmd /c "docker exec -i ecommerce-mysql mysql -uroot -proot ecommerce < database\seed.sql"
```

### 验证部署

```powershell
# 查看服务状态
docker compose -p ecommerce ps

# 健康检查
Invoke-WebRequest -Uri http://localhost:4000/api/health -UseBasicParsing | Select-Object -ExpandProperty Content

# 预期返回：
# {"success":true,"message":"所有服务正常","data":{"gateway":"healthy","services":{...}}}
```

## 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| API Gateway | 4000 | 统一入口 |
| Auth Service | 4006 | 认证服务 |
| User Service | 4001 | 用户服务 |
| Product Service | 4002 | 商品服务 |
| Order Service | 4003 | 订单服务 |
| MQ Service | 4004 | 消息服务 |
| Search Service | 4005 | 搜索服务 |
| MySQL | 3306 | 数据库 |
| Redis | 6379 | 缓存 |
| Nginx | 8080 | 反向代理 |

## 常用命令

```powershell
# 查看日志
docker compose -p ecommerce logs -f
docker compose -p ecommerce logs -f gateway
docker compose -p ecommerce logs -f auth-service

# 重启单个服务
docker restart ecommerce-gateway

# 停止所有服务
docker compose -p ecommerce down

# 停止并删除数据卷（慎用，会清空数据库）
docker compose -p ecommerce down -v

# 进入容器调试
docker exec -it ecommerce-mysql mysql -uroot -proot ecommerce
docker exec -it ecommerce-gateway sh
```

## 环境变量

在 `docker-compose.yml` 中配置：

```yaml
environment:
  DB_HOST: mysql
  DB_PORT: 3306
  DB_USER: root
  DB_PASSWORD: root
  DB_NAME: ecommerce
  REDIS_HOST: redis
  REDIS_PORT: 6379
  JWT_SECRET: ecommerce_jwt_secret_key_2024
```

## 数据库管理

### 重置数据库

```powershell
# 删除数据卷并重建
docker compose -p ecommerce down -v
docker volume rm ecommerce_mysql_data 2>$null
docker compose -p ecommerce up -d mysql
Start-Sleep -Seconds 15
cmd /c "docker exec -i ecommerce-mysql mysql -uroot -proot ecommerce < database\schema.sql"
cmd /c "docker exec -i ecommerce-mysql mysql -uroot -proot ecommerce < database\seed.sql"
```

### 备份数据库

```powershell
docker exec ecommerce-mysql mysqldump -uroot -proot ecommerce > backup.sql
```

## 故障排查

### 服务无法启动

```powershell
# 查看容器状态
docker compose -p ecommerce ps

# 查看错误日志
docker compose -p ecommerce logs --tail=50 [服务名]
```

### 常见问题

1. **端口被占用**: 修改 docker-compose.yml 中的端口映射
2. **MySQL 连接失败**: 等待 MySQL 完全启动（约15秒）
3. **镜像拉取失败**: 配置 Docker 镜像加速器
4. **注册/登录失败**: 检查 auth-service 日志，确认数据库字段完整

## 生产环境建议

- [ ] 使用外部 MySQL + Redis（非 Docker 内）
- [ ] 配置 SSL 证书（HTTPS）
- [ ] 设置强密码和 JWT Secret
- [ ] 配置防火墙规则
- [ ] 启用日志收集和监控
- [ ] 使用 Kubernetes 编排
