# 仿京东淘宝网全栈电商平台

基于 React Native + Node.js + MySQL + Redis + Docker 的电商项目，当前正式主线为 `gateway + microservices`。

## 当前架构

```text
React Native App
  -> Nginx (HTTPS / 443)
    -> API Gateway (4100 -> 4000)
      -> auth-service    (4006)
      -> user-service    (4001)
      -> product-service (4002)
      -> order-service   (4003)
      -> mq-service      (4004)
      -> search-service  (4005)
    -> MySQL (3306)
    -> Redis (6379)
```

## 现在的工作约定

- `backend/microservices` 是正式后端主线
- `backend/src` 仅作为历史参考代码
- 前端统一走 `frontend/src/api/client.js`
- 生产环境地址统一使用 `https://api.xiaoyimall.com/api`
- Android release 签名从 `frontend/android/keystore.properties` 读取

## 已补齐的关键脚本

- `frontend` 下的 `npm run bundle:android`
- `backend/microservices` 下的 `npm run smoke`

## 已完成的阶段

1. 主架构统一
2. 接口契约统一
3. 后端工程边界整理
4. 前端 App 架构整理
5. 构建和发布体系硬化
6. 最小测试和质量门禁

## 验证命令

```bash
cd frontend
npm run bundle:android

cd ../backend/microservices
npm run smoke

cd ../
docker compose config
```

## 说明

- `frontend/android/keystore.properties.example` 是签名模板，真实 `keystore.properties` 不应提交
- `frontend/android/.gitignore` 已忽略签名文件
- `frontend/android/app/src/main/AndroidManifest.xml` 只保留正式包需要的最小权限
