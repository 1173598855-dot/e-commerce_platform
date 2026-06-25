# 电商平台部署指南

## 目录结构
```
ecommerce-platform/
├── backend/
│   └── microservices/
│       ├── common/
│       ├── user-service/
│       ├── product-service/
│       ├── order-service/
│       ├── mq-service/
│       ├── search-service/
│       └── gateway/
├── frontend/
├── database/
└── docker-compose.yml
```

## 环境要求
- Docker & Docker Compose
- Node.js 18+ (本地开发)
- MySQL 8.0
- Redis 7

## 快速部署

### 1. 使用 Docker Compose 一键部署
```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 2. 本地开发部署

#### 启动数据库和缓存
```bash
# 启动 MySQL (phpStudy)
# 启动 Redis (Docker)
docker run -d --name ecommerce-redis -p 6379:6379 redis:7-alpine
```

#### 安装依赖
```bash
cd backend/microservices
npm install
```

#### 启动微服务
```bash
# 启动所有服务
npm run start:all

# 或单独启动某个服务
npm run start:user
npm run start:product
npm run start:order
npm run start:search
npm run start:gateway
```

### 3. 数据库初始化
```bash
# 导入数据库结构
mysql -u root -p ecommerce < database/schema.sql
```

## 服务端口
- API 网关: 3000
- 用户服务: 3001
- 商品服务: 3002
- 订单服务: 3003
- 消息队列: 3004
- 搜索服务: 3005
- MySQL: 3306
- Redis: 6379

## 环境变量配置
创建 `.env` 文件：
```env
# 服务器配置
PORT=3000
NODE_ENV=production

# MySQL配置
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=ecommerce

# Redis配置
REDIS_HOST=redis
REDIS_PORT=6379

# JWT配置
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRES_IN=7d
```

## 阿里云部署

### 1. 准备云服务器
- 选择配置：4核8GB及以上
- 操作系统：Ubuntu 20.04 LTS 或 CentOS 7+
- 安全组规则：开放端口 3000-3005, 3306, 6379

### 2. 安装依赖
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. 部署应用
```bash
# 克隆项目
git clone <your-repo-url>
cd ecommerce-platform

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置生产环境参数

# 启动服务
docker-compose up -d
```

### 4. 配置 Nginx 反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 腾讯云部署

### 1. 使用云容器服务
- 创建 TKE 集群
- 导入 docker-compose.yml
- 配置负载均衡

### 2. 使用云数据库
- 替换本地 MySQL 为云数据库 RDS
- 替换本地 Redis 为云数据库 Redis

## 监控和日志

### 1. 健康检查端点
```bash
# 检查所有服务状态
curl http://localhost:3000/api/health
```

### 2. 日志收集
```bash
# 查看特定服务日志
docker-compose logs -f user-service
```

## 备份和恢复

### 1. 数据库备份
```bash
# 备份 MySQL
docker exec ecommerce-mysql mysqldump -u root -p ecommerce > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker exec -i ecommerce-mysql mysql -u root -p ecommerce < backup.sql
```

### 2. Redis 备份
```bash
# Redis 持久化文件在 volumes/redis_data 目录
```

## 性能优化建议

1. **数据库优化**
   - 添加适当索引
   - 使用连接池
   - 定期分析和优化表

2. **缓存策略**
   - 热点数据缓存
   - 设置合理的过期时间
   - 使用 Redis 集群

3. **负载均衡**
   - 使用 Nginx 或云负载均衡
   - 水平扩展微服务实例

4. **监控告警**
   - 使用 Prometheus + Grafana
   - 配置关键指标告警

## 故障排查

### 1. 服务无法启动
```bash
# 检查端口占用
netstat -tulpn | grep :3000

# 检查服务日志
docker-compose logs user-service
```

### 2. 数据库连接失败
```bash
# 检查 MySQL 状态
docker exec -it ecommerce-mysql mysql -u root -p -e "STATUS"

# 测试连接
mysql -h localhost -P 3306 -u root -p ecommerce
```

### 3. Redis 连接失败
```bash
# 检查 Redis 状态
docker exec -it ecommerce-redis redis-cli ping

# 测试连接
redis-cli -h localhost -p 6379 ping
```