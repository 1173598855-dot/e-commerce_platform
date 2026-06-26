# 仿京东淘宝网全栈电商平台

一个完整的全栈电商微服务项目，采用 React Native 前端 + Node.js 微服务后端 + MySQL + Redis 架构，通过 Docker Compose 编排部署。

## 技术栈

- **前端**: React Native (iOS/Android)
- **后端**: Node.js + Express (微服务架构)
- **数据库**: MySQL 8.0
- **缓存**: Redis 7
- **消息队列**: Redis Pub/Sub
- **部署**: Docker + Docker Compose
- **网关**: 自研 API Gateway (路由转发 + JWT鉴权 + 限流)

## 微服务架构

### 服务列表

| 服务名称 | 端口 | 描述 |
|---------|------|------|
| API Gateway | 4000 | 统一入口，路由转发、JWT鉴权、限流 |
| Auth Service | 4006 | 认证中心：注册、登录、JWT签发 |
| User Service | 4001 | 用户信息、地址、收藏、优惠券、积分 |
| Product Service | 4002 | 商品管理、分类、SKU、评价 |
| Order Service | 4003 | 订单创建、支付、状态管理 |
| MQ Service | 4004 | 消息队列、通知、IM聊天 |
| Search Service | 4005 | 商品搜索、热搜、搜索历史 |
| MySQL | 3306 | 数据存储 |
| Redis | 6379 | 缓存与消息队列 |
| Nginx | 8080 | 反向代理（可选） |

### 架构图

```
┌──────────────────────────────────────────────────┐
│                    客户端                         │
│          React Native / 浏览器                    │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│              API Gateway (:4000)                  │
│    JWT鉴权 │ 限流(100次/分钟) │ 统一日志 │ 路由   │
└──┬──────┬──────┬──────┬──────┬──────┬────────────┘
   │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼
┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐
│Auth ││User ││Prod ││Order││ MQ  ││Search│
│:4006││:4001││:4002││:4003││:4004││:4005│
└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘
   │      │      │      │      │      │
   └──────┴──────┴──┬───┴──────┴──────┘
                    ▼
        ┌──────────────────────┐
        │  MySQL + Redis       │
        │  (数据存储与缓存)     │
        └──────────────────────┘
```

## 快速开始

### 环境要求

- Docker & Docker Compose
- Node.js 18+ (可选，用于本地开发)

### 一键启动

```powershell
# 克隆项目
git clone git@github.com:1173598855-dot/e-commerce_platform.git
cd e-commerce_platform

# 启动所有服务
docker compose -p ecommerce up -d

# 查看服务状态
docker compose -p ecommerce ps

# 查看日志
docker compose -p ecommerce logs -f
```

### 初始化数据

```powershell
# 等待 MySQL 启动（约10秒）
Start-Sleep -Seconds 10

# 导入测试数据
cmd /c "docker exec -i ecommerce-mysql mysql -uroot -proot ecommerce < database\seed.sql"
```

### 验证服务

```powershell
# 健康检查
Invoke-WebRequest -Uri http://localhost:4000/api/health -UseBasicParsing

# 商品列表
Invoke-WebRequest -Uri http://localhost:4000/api/products -UseBasicParsing

# 注册测试
Invoke-WebRequest -Uri http://localhost:4000/api/auth/register -Method POST -ContentType "application/json" -Body '{"phone":"13900000001","password":"123456","nickname":"测试用户"}' -UseBasicParsing
```

## API 文档

### 基础 URL

```
http://localhost:4000/api
```

### 公开接口（无需鉴权）

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/password-login | 密码登录 |
| POST | /api/auth/sms-login | 短信验证码登录 |
| POST | /api/auth/wx-login | 微信登录 |
| POST | /api/auth/qq-login | QQ登录 |
| POST | /api/auth/send-code | 发送验证码 |
| GET | /api/products | 商品列表（分页、搜索、筛选） |
| GET | /api/products/hot | 热门商品 |
| GET | /api/products/:id | 商品详情 |
| GET | /api/categories | 分类列表 |
| GET | /api/search | 搜索商品 |
| GET | /api/search/hot | 热门搜索 |
| GET | /api/health | 健康检查 |

### 鉴权接口（需 Bearer Token）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/auth/profile | 获取用户信息 |
| PUT | /api/auth/profile | 更新用户信息 |
| GET | /api/user/addresses | 收货地址列表 |
| POST | /api/user/addresses | 新增收货地址 |
| GET | /api/user/favorites | 收藏列表 |
| POST | /api/user/favorites | 添加收藏 |
| GET | /api/orders | 订单列表 |
| POST | /api/orders | 创建订单 |
| GET | /api/orders/:id | 订单详情 |
| POST | /api/reviews | 提交评价 |

### 鉴权方式

```
Header: Authorization: Bearer <token>
```

## 数据库设计

共 25 张表，覆盖电商全业务场景：

- **用户相关**: users, addresses, favorites, user_coupons, points_logs, search_histories, user_behavior_logs
- **商品相关**: products, categories, product_images, product_skus, product_spec_options
- **订单相关**: orders, order_items
- **营销相关**: coupons, flash_sales
- **社交相关**: reviews, chat_messages, notifications
- **商家相关**: merchants
- **搜索相关**: hot_searches

详见 `database/schema.sql`

## 功能特性

### 核心功能

- [x] 用户注册登录（手机号 + 密码/短信/微信/QQ）
- [x] 商品管理（分类/SKU/库存/多图）
- [x] 购物车
- [x] 订单流程（创建 → 支付 → 发货 → 完成）
- [x] 模拟支付
- [x] 商品评价
- [x] 收藏夹
- [x] 收货地址管理
- [x] 优惠券系统
- [x] 积分系统
- [x] 消息通知
- [x] IM聊天
- [x] 搜索（关键词/历史/热词/联想）
- [x] 短视频
- [x] 物流追踪

### 增强功能

- [x] 微服务架构
- [x] API Gateway（JWT鉴权 + 限流 + 日志）
- [x] Redis 缓存
- [x] Docker Compose 编排
- [x] 秒杀活动
- [x] 商家后台
- [x] 数据看板
- [ ] Elasticsearch 搜索引擎
- [ ] RabbitMQ 消息队列
- [ ] 服务监控 (Prometheus + Grafana)
- [ ] CI/CD 流水线

## 项目结构

```
├── backend/
│   ├── microservices/
│   │   ├── gateway/          # API 网关
│   │   ├── auth-service/     # 认证服务
│   │   ├── user-service/     # 用户服务
│   │   ├── product-service/  # 商品服务
│   │   ├── order-service/    # 订单服务
│   │   ├── mq-service/       # 消息队列服务
│   │   ├── search-service/   # 搜索服务
│   │   └── shared/           # 共享工具库
│   └── src/                  # 旧版单体代码（参考）
├── frontend/
│   └── src/
│       ├── api/              # API 请求封装
│       ├── pages/            # 页面组件
│       └── components/       # 公共组件
├── database/
│   ├── schema.sql            # 数据库建表脚本（完整版）
│   └── seed.sql              # 测试数据
├── nginx/
│   └── nginx.conf            # Nginx 配置
├── docker-compose.yml        # Docker 编排
└── .github/
    └── workflows/ci.yml      # CI/CD 配置
```

## 开发指南

### 本地开发

```powershell
# 启动 MySQL + Redis
docker compose -p ecommerce up -d mysql redis

# 启动微服务（各目录独立）
cd backend/microservices/auth-service
npm install
npm start

# 启动前端
cd frontend
npm install
npx expo start
```

### 新增微服务

1. 在 `backend/microservices/` 下创建服务目录
2. 添加 `index.js`、`package.json`、`Dockerfile`
3. 复制 `shared/` 目录到服务目录内
4. 在 `docker-compose.yml` 中添加服务配置
5. 在 `gateway/index.js` 中添加路由规则

### 测试

```powershell
# 健康检查
Invoke-WebRequest -Uri http://localhost:4000/api/health -UseBasicParsing | Select-Object -ExpandProperty Content
```

## 部署

### Docker Compose（推荐）

```powershell
docker compose -p ecommerce up -d --build
```

### 生产环境建议

- 使用 Nginx 反向代理 + SSL
- 配置域名和 CORS
- 添加 Elasticsearch 搜索引擎
- 引入 Redis Cluster 高可用
- 使用 Kubernetes 编排
- 配置 CI/CD 自动部署

## 许可证

MIT License

## 联系方式

如有问题请提交 Issue 或联系项目负责人
