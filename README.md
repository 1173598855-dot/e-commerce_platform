# 仿京东淘宝网全栈电商平台

基于 React Native + Node.js + MySQL + Redis + Docker 的全栈电商系统，采用微服务架构。

## 技术栈

| 层级 | 技术 |
|------|------|
| 移动端 | React Native 0.73 + React Navigation |
| API 网关 | Express + Helmet + CORS + JWT + 限流 |
| 后端微服务 | Express + MySQL + Redis |
| 基础设施 | Docker Compose + Nginx + MySQL 8.0 + Redis 7 |

## 系统架构

```
Client (React Native App)
  → Nginx (HTTPS / 443)
    → API Gateway (4000)
      → auth-service    (4006)  认证中心
      → user-service    (4001)  用户服务
      → product-service (4002)  商品服务
      → order-service   (4003)  订单服务
      → mq-service      (4004)  消息服务
      → search-service  (4005)  搜索服务
    → MySQL (3306)
    → Redis (6379)
```

## 功能清单

### 用户模块
- 手机号注册 / 密码登录 / 验证码登录
- 微信小程序登录（code → openid/unionid → JWT）
- QQ 登录
- 个人信息管理 / 收货地址管理
- Token 自动刷新 / 被顶号检测

### 商品模块
- 商品列表 / 详情 / 分类浏览
- SKU 规格选择
- 商品搜索 / 热搜词 / 搜索历史
- 商品评价 / 评分

### 订单模块
- 购物车管理
- 下单 / 支付（模拟）/ 取消 / 确认收货
- 物流追踪

### 营销模块
- 优惠券领取与使用
- 积分体系（签到 / 消费 / 积分日志）
- 秒杀活动

### 消息模块
- 系统通知 / 订单通知
- 用户间聊天

### AI 模块
- 个性化推荐
- 行为记录
- AI 对话

### 数据看板
- 销售概览 / 趋势图
- 商品排行 / 用户活跃分析

### 商家模块
- 商家入驻 / 店铺管理
- 商品管理

## 快速开始

### 前提条件
- Node.js 20+
- Docker Desktop
- Android Studio（打包用）

### 一键启动

```bash
# 克隆项目
git clone git@github.com:1173598855-dot/e-commerce_platform.git
cd e-commerce_platform

# 启动全部服务
docker compose -p ecommerce up -d --build

# 等待 MySQL 初始化（约15秒）
Start-Sleep -Seconds 15

# 导入测试数据
cmd /c "docker exec -i ecommerce-mysql mysql -uroot -proot ecommerce < database\seed.sql"
```

### 验证部署

```bash
# 健康检查
Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -UseBasicParsing

# 预期返回所有服务 healthy
```

### 前端开发

```bash
cd frontend
npm install

# 切换环境变量（默认 development）
cp .env.development .env

# 启动 Metro
npx react-native start

# 运行 Android
npx react-native run-android
```

## 服务端口

| 服务 | 端口 | 说明 | 对外 |
|------|------|------|------|
| Nginx | 80 / 443 | 反向代理 | ✅ |
| API Gateway | 4000 | 统一入口 | ✅（开发） |
| Auth Service | 4006 | 认证服务 | ❌ |
| User Service | 4001 | 用户服务 | ❌ |
| Product Service | 4002 | 商品服务 | ❌ |
| Order Service | 4003 | 订单服务 | ❌ |
| MQ Service | 4004 | 消息服务 | ❌ |
| Search Service | 4005 | 搜索服务 | ❌ |
| MySQL | 3306 | 数据库 | ❌ |
| Redis | 6379 | 缓存 | ❌ |

> 生产环境只有 Nginx 对外，微服务端口不暴露。

## 项目结构

```
├── frontend/                    # React Native 前端
│   ├── App.js                   # 入口
│   ├── src/
│   │   ├── api/                 # 请求封装（axios + Token刷新）
│   │   ├── screens/             # 页面（28个）
│   │   ├── navigation/          # 路由导航
│   │   ├── components/          # 公共组件
│   │   └── store/               # 状态管理
│   ├── .env.development         # 开发环境
│   ├── .env.staging             # 预发布环境
│   └── .env.production          # 生产环境
│
├── backend/
│   ├── microservices/           # 微服务
│   │   ├── gateway/             # API 网关（统一入口）
│   │   ├── auth-service/        # 认证服务
│   │   ├── user-service/        # 用户服务
│   │   ├── product-service/     # 商品服务
│   │   ├── order-service/       # 订单服务
│   │   ├── mq-service/          # 消息服务
│   │   └── search-service/      # 搜索服务
│   └── src/                     # 单体模式（备用）
│
├── database/
│   ├── schema.sql               # 建表脚本
│   ├── migrate_v2.sql           # 迁移脚本
│   └── seed.sql                 # 测试数据
│
├── nginx/
│   └── nginx.conf               # Nginx 配置（HTTPS）
│
├── docker-compose.yml           # 容器编排
├── DEPLOYMENT.md                # 部署文档
├── BUILD_GUIDE.md               # App 打包指南
└── PRODUCTION_CHECKLIST.md      # 上线清单
```

## 统一错误码

| 码段 | 含义 | 示例 |
|------|------|------|
| `10000` | 成功 | 登录成功、下单成功 |
| `20000` | 参数错误 | 缺少手机号、格式不对 |
| `30000` | 鉴权失败 | Token 过期、被顶号、账号冻结 |
| `40000` | 业务失败 | 用户不存在、库存不足 |
| `50000` | 系统异常 | 服务不可用、超时 |

统一响应格式：
```json
{
  "success": false,
  "code": "TOKEN_EXPIRED",
  "message": "Token已过期",
  "requestId": "cc9116f1-4b48-4ee3-9f66-6ce2b6bae240"
}
```

## 短信验证码

支持三通道，通过 `.env` 切换：

```
SMS_PROVIDER=console    # 开发：日志打印
SMS_PROVIDER=aliyun     # 生产：阿里云短信
SMS_PROVIDER=tencent    # 生产：腾讯云短信
```

限频策略：
- 同手机号 60s 冷却
- 同手机号每日上限 10 次
- 同 IP 每日上限 20 次

## API 前缀

- 旧版兼容：`/api/*`
- 新版推荐：`/api/v1/*`
- 两个前缀均可访问，推荐新项目直接用 `/api/v1/*`

## 文档

- [部署文档](DEPLOYMENT.md) - 完整部署流程
- [打包指南](BUILD_GUIDE.md) - RN App 打包 APK/AAB
- [上线清单](PRODUCTION_CHECKLIST.md) - 生产上线逐项核对

## License

MIT
