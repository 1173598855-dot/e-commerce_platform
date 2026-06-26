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

## 打包 APK（调试）

```bash
cd frontend
npx react-native run-android
```

## 打包 AAB（上架 Google Play）

```bash
cd frontend/android

# Release AAB
./gradlew bundleRelease

# 产物路径：
# android/app/build/outputs/bundle/release/app-release.aab
```

## 打包 APK（直接安装）

```bash
cd frontend/android

# Release APK
./gradlew assembleRelease

# 产物路径：
# android/app/build/outputs/apk/release/app-release.apk
```

## 签名配置

### 1. 生成签名密钥
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### 2. 配置 gradle
编辑 `android/gradle.properties`：
```
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=*****
MYAPP_RELEASE_KEY_PASSWORD=*****
```

### 3. 配置签名
编辑 `android/app/build.gradle`：
```gradle
android {
    signingConfigs {
        release {
            storeFile file(MYAPP_RELEASE_STORE_FILE)
            storePassword MYAPP_RELEASE_STORE_PASSWORD
            keyAlias MYAPP_RELEASE_KEY_ALIAS
            keyPassword MYAPP_RELEASE_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## 替换图标

### 必须替换的图标
| 尺寸 | 路径 | 用途 |
|------|------|------|
| 48x48 | `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` | 启动器图标 |
| 72x72 | `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` | 启动器图标 |
| 96x96 | `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` | 启动器图标 |
| 144x144 | `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` | 启动器图标 |
| 192x192 | `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` | 启动器图标 |

### 推荐工具
- [App Icon Generator](https://www.appicon.co/) - 上传一张 1024x1024 生成全套
- [RN Icon Generator](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)

## 替换启动屏

编辑 `android/app/src/main/res/drawable/splash_screen.xml`：
```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background" />
    <item android:gravity="center" android:width="200dp" android:height="200dp">
        <bitmap android:src="@drawable/splash_logo" android:gravity="center" />
    </item>
</layer-list>
```

## 常用命令

```bash
# 清理构建
cd android && ./gradlew clean

# 安装到设备
adb install app/build/outputs/apk/release/app-release.apk

# 查看日志
adb logcat | grep -E "ReactNative|JSLog"
```
