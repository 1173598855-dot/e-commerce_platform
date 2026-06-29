# E-Commerce 跨平台移动应用

## 项目概述

基于 React Native 的跨平台电商移动应用，支持 iOS 和 Android 平台。

## 技术栈

### 核心框架
- **React Native** 0.72.6 - 跨平台移动开发框架
- **React** 18.2.0 - UI 库
- **TypeScript** 4.8+ - 类型安全

### 导航与路由
- **@react-navigation/native** - 导航库
- **@react-navigation/bottom-tabs** - 底部标签导航
- **@react-navigation/stack** - 堆栈导航

### 状态管理
- **zustand** - 轻量级状态管理
- **react-query** - 服务器状态管理

### 网络与存储
- **axios** - HTTP 客户端
- **@react-native-async-storage/async-storage** - 本地存储
- **react-native-keychain** - 安全存储

### UI 与交互
- **react-native-vector-icons** - 图标库
- **react-native-fast-image** - 图片优化
- **lottie-react-native** - 动画
- **react-native-svg** - SVG 支持

### 原生功能
- **react-native-biometrics** - 生物识别
- **react-native-push-notification** - 推送通知
- **react-native-iap** - 应用内购买
- **react-native-image-picker** - 图片选择

## 项目结构

```
mobile/
├── src/
│   ├── api/              # API 请求层
│   ├── assets/           # 静态资源
│   ├── components/       # 通用组件
│   ├── hooks/            # 自定义 Hooks
│   ├── navigation/       # 导航配置
│   ├── screens/          # 页面组件
│   ├── store/            # 状态管理
│   ├── theme/            # 主题配置
│   ├── types/            # TypeScript 类型
│   ├── utils/            # 工具函数
│   └── App.tsx           # 应用入口
├── android/              # Android 原生代码
├── ios/                  # iOS 原生代码
├── __tests__/            # 测试文件
├── .env                  # 环境变量
├── app.json              # 应用配置
├── babel.config.js       # Babel 配置
├── metro.config.js       # Metro 配置
├── package.json          # 依赖管理
├── tsconfig.json         # TypeScript 配置
└── README.md             # 项目文档
```

## 功能模块

### 1. 用户模块
- [x] 注册/登录
- [x] 短信验证码
- [x] 生物识别登录
- [x] 个人资料管理
- [x] 地址管理

### 2. 商品模块
- [x] 商品列表
- [x] 商品搜索
- [x] 商品详情
- [x] 商品分类
- [x] 收藏功能

### 3. 购物模块
- [x] 购物车
- [x] 下单流程
- [x] 订单管理
- [x] 支付集成
- [x] 优惠券

### 4. 其他模块
- [x] 消息通知
- [x] 客服聊天
- [x] 评价系统
- [x] 物流追踪

## 开发环境配置

### 前置要求
- Node.js >= 16
- React Native CLI
- Android Studio (Android)
- Xcode (iOS)

### 安装依赖
```bash
cd mobile
npm install
# 或
yarn install
```

### 运行应用
```bash
# iOS
npm run ios

# Android
npm run android

# 启动 Metro
npm start
```

## 环境变量配置

创建 `.env` 文件：
```env
API_BASE_URL=http://your-gateway-url:8080
API_TIMEOUT=30000
ENABLE_MOCK=false
```

## 性能优化

### 启动优化
- 延迟加载非关键模块
- 优化 bundle 大小
- 使用 Hermes 引擎

### 渲染优化
- 使用 FastImage 优化图片
- 实现列表虚拟化
- 减少重渲染

### 网络优化
- 请求缓存
- 离线支持
- 增量更新

## 测试

```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# E2E 测试
npm run test:e2e
```

## 构建发布

### Android
```bash
cd android
./gradlew assembleRelease
```

### iOS
```bash
cd ios
xcodebuild -workspace ECommerce.xcworkspace -scheme ECommerce -configuration Release
```

## 故障排查

### 常见问题
1. **Metro 缓存问题**
   ```bash
   npm start -- --reset-cache
   ```

2. **iOS 依赖问题**
   ```bash
   cd ios && pod install
   ```

3. **Android 构建失败**
   ```bash
   cd android && ./gradlew clean
   ```

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交代码
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License
