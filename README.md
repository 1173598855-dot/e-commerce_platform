# 仿京东/淘宝全栈电商平台

## 项目简介
这是一个完整的全栈电商平台，采用微服务架构，包含用户系统、商品系统、订单系统、支付系统、AI推荐等核心功能。

## 技术栈
- **前端**: React Native (iOS/Android)
- **后端**: Node.js + Express (微服务架构)
- **数据库**: MySQL 8.0 + Redis 7
- **消息队列**: Redis Pub/Sub
- **部署**: Docker + Docker Compose

## 微服务架构

### 服务列表
| 服务名称 | 端口 | 描述 |
|---------|------|------|
| API Gateway | 3000 | 统一入口，路由分发 |
| User Service | 3001 | 用户注册、登录、信息管理 |
| Product Service | 3002 | 商品管理、分类、SKU |
| Order Service | 3003 | 订单创建、状态管理 |
| MQ Service | 3004 | 消息队列、通知服务 |
| Search Service | 3005 | 商品搜索、历史记录 |

### 架构图
`
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Gateway    │  :3000
                    │  (Nginx)    │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
    │ User Svc    │ │Product Svc │ │ Order Svc  │
    │    :3001    │ │    :3002   │ │   :3003    │
    └──────┬──────┘ └─────┬──────┘ └─────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
              ┌────────────▼────────────┐
              │   MySQL + Redis         │
              │   (数据存储与缓存)       │
              └─────────────────────────┘
`

## 快速开始

### 环境要求
- Docker & Docker Compose
- Node.js 18+ (可选，用于本地开发)
- MySQL 8.0 (由Docker提供)
- Redis 7 (由Docker提供)

### 一键启动
`powershell
# 克隆项目
git clone <repository-url>
cd 仿京东淘宝网全栈开发

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
`

### 本地开发
`powershell
# 启动后端微服务
cd backend/microservices
npm install
npm run start:all

# 启动前端
cd ../../frontend
npm install
npx expo start
`

## API 文档

### 基础URL
`
http://localhost:3000/api
`

### 主要接口

#### 用户服务 (/api/user)
- POST /register - 用户注册
- POST /sms-login - 短信登录
- GET /profile - 获取用户信息
- PUT /profile - 更新用户信息

#### 商品服务 (/api/product)
- GET / - 商品列表 (支持分页、搜索、筛选)
- GET /hot - 热门商品
- GET /:id - 商品详情
- POST / - 创建商品 (需认证)
- PUT /:id - 更新商品 (需认证)
- DELETE /:id - 删除商品 (需认证)

#### 订单服务 (/api/order)
- GET / - 订单列表
- POST / - 创建订单
- PUT /:id/cancel - 取消订单
- PUT /:id/confirm - 确认收货
- GET /:id - 订单详情

#### 搜索服务 (/api/search)
- GET / - 搜索商品
- GET /suggestions - 搜索建议
- GET /hot - 热门搜索
- POST /history - 保存搜索历史
- GET /history - 获取搜索历史
- DELETE /history - 清除搜索历史

## 数据库设计

### 核心表
- users - 用户表
- products - 商品表
- categories - 分类表
- skus - SKU表
- orders - 订单表
- order_items - 订单项表
- eviews - 评价表
- avorites - 收藏表
- ddresses - 地址表
- coupons - 优惠券表
- points_logs - 积分日志表

详细SQL脚本见 database/schema.sql

## 功能特性

### 核心功能
- [x] 用户注册登录 (手机号/密码/短信/第三方)
- [x] 商品管理 (分类/SKU/库存)
- [x] 购物车
- [x] 订单流程 (创建/支付/发货/完成)
- [x] 模拟支付 (支付宝/微信)
- [x] 商品评价
- [x] 收藏夹
- [x] 收货地址管理
- [x] 优惠券系统
- [x] 积分系统
- [x] 消息通知
- [x] IM聊天
- [x] AI推荐
- [x] AI客服
- [x] 搜索 (关键词/历史/热词/联想)
- [x] 短视频
- [x] 物流追踪
- [x] 商家后台
- [x] 数据看板

### 增强功能
- [x] 微服务架构
- [x] Redis缓存
- [x] 消息队列
- [x] Docker部署
- [ ] Elasticsearch搜索
- [ ] RabbitMQ消息队列
- [ ] 服务监控 (Prometheus+Grafana)
- [ ] CI/CD流水线

## 测试

### 单元测试
`powershell
cd backend/microservices
npm test
`

### API测试
导入 postman-collection.json 到 Postman 进行测试

## 部署

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 开发计划

### 第7周: 微服务拆分 + 性能优化 ✅
- [x] 用户微服务
- [x] 商品微服务
- [x] 订单微服务
- [x] 消息队列服务
- [x] 搜索微服务
- [x] API网关
- [x] Docker Compose编排
- [x] Jest单元测试
- [x] Postman测试集合

### 第8周: 测试 + 打包 + 部署 ✅
- [x] 单元测试框架
- [x] API测试集合
- [x] Docker部署配置
- [x] 部署文档
- [x] 清理临时文件

## 团队成员
- 前端开发
- 后端开发
- 数据库设计
- UI/UX设计
- 测试工程师

## 许可证
MIT License

## 联系方式
如有问题请提交 Issue 或联系项目负责人