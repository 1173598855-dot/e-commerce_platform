# RN App 打包指南

## 环境准备

### Android
- JDK 17
- Android SDK（API 34）
- Android NDK
- Gradle 8.x

### 环境变量切换
```bash
# 开发环境
cp .env.development .env

# 预发布环境
cp .env.staging .env

# 生产环境
cp .env.production .env
```

## 打包和验证

```bash
cd frontend
npm run bundle:android
```

```bash
cd backend/microservices
npm run smoke
```

```bash
cd .
docker compose config
```

## Android Release 签名

1. 复制模板：
```bash
cp android/keystore.properties.example android/keystore.properties
```

2. 填写真实签名信息，不要提交 `android/keystore.properties`

3. Release 构建会读取 `android/keystore.properties`，未配置时仍可保持本地开发构建可用

## Release 构建

```bash
cd frontend/android
./gradlew bundleRelease
./gradlew assembleRelease
```

## 说明

- 生产环境 API 地址统一来自 `frontend/.env.production`
- `frontend/android/.gitignore` 已忽略签名文件
- `frontend/android/app/src/main/AndroidManifest.xml` 已收紧为正式包最小权限
