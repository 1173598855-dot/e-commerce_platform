# 小奕商城 - APP图标配置说明

## 图标文件清单

请将以下图标文件放置到对应的目录：

### 1. 主图标文件（必需）
- **文件路径**: `C:\GitHub\E_commerce\mobile\assets\icons\app-icon.png`
- **尺寸**: 1024x1024 像素
- **用途**: Expo/React Native 主图标

### 2. Android 图标
需要将以下尺寸的图标放入 `android\app\src\main\res\mipmap-*` 目录：

- `mipmap-hdpi\ic_launcher.png` (72x72)
- `mipmap-mdpi\ic_launcher.png` (48x48)
- `mipmap-xhdpi\ic_launcher.png` (96x96)
- `mipmap-xxhdpi\ic_launcher.png` (144x144)
- `mipmap-xxxhdpi\ic_launcher.png` (192x192)

### 3. iOS 图标
使用 Xcode 打开 iOS 项目，替换 `Images.xcassets\AppIcon.appiconset` 中的所有图标尺寸

### 4. 自适应图标（Android 8.0+）
- **前景**: `assets\icons\adaptive-icon.png` (1024x1024)
- **背景**: 在 `app.json` 中配置 `backgroundColor`

### 5. 启动屏图片
- **文件路径**: `assets\icons\splash.png`
- **尺寸**: 1242x2436 像素（推荐）

### 6. Favicon（Web）
- **文件路径**: `assets\icons\favicon.png`
- **尺寸**: 64x64 像素

## 快速生成图标

### 使用在线工具
1. [App Icon Generator](https://appicon.co/)
2. [MakeAppIcon](https://makeappicon.com/)

### 使用 ImageMagick（命令行）
```bash
# 安装 ImageMagick
# 然后执行以下命令生成不同尺寸
magick app-icon.png -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
magick app-icon.png -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
# ... 以此类推
```

## 应用名称配置

应用名称已在以下文件中配置为"小奕商城"：
- `app.json` - `displayName`: "小奕商城"
- `package.json` - `name`: "xiaoyi-mall", `description`: "小奕商城"

## 设计要求

### 图标设计建议
- **主题**: 电商、购物、商品
- **颜色**: 建议使用品牌主色（如橙色、红色等暖色调）
- **元素**: 可以包含购物车、商品袋、商标字母"小"或"奕"
- **风格**: 简洁、现代、易识别

### 示例设计方案
```
方案一：购物车 + 小奕文字
方案二：商品袋图标 + 品牌色
方案三：字母 "X" (小奕首字母) + 渐变背景
```

## 验证配置

运行以下命令验证配置：

```bash
cd C:\GitHub\E_commerce\mobile
npm start
```

在 Expo 开发工具中检查应用名称是否显示为"小奕商城"。

## 注意事项

1. **图标文件格式**: 必须使用 PNG 格式，支持透明度
2. **图标文件大小**: 主图标不超过 1MB
3. **图标内容**: 避免包含文字（iOS App Store 审核要求）
4. **版权**: 确保图标设计不侵犯第三方版权

## 临时解决方案

在获得正式图标之前，可以使用以下方式生成临时图标：

### 使用 React Native Paper 的 Icon
在 `App.js` 中使用文本作为临时图标：

```javascript
import { Text } from 'react-native';

<Text style={{ fontSize: 24, fontWeight: 'bold' }}>小奕</Text>
```

---

**配置完成时间**: 2026-06-27
**配置人员**: WorkBuddy AI
