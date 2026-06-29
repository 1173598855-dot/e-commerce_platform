/**
 * 电商 App 设计系统 (Design System)
 * 版本: 1.0.0
 * 设计理念: 简洁、现代、易用
 * 
 * 本设计系统提供统一的设计令牌 (Design Tokens)，
 * 确保整个应用的视觉一致性和开发效率。
 */

// ==================== 颜色系统 ====================
export const Colors = {
  // 主色调 (Primary)
  primary: '#ff6b35',          // 品牌主色 - 活力橙
  primaryLight: '#ff8c5a',     // 主色浅色
  primaryDark: '#e55a2a',      // 主色深色
  primaryBackground: '#fff3ed', // 主色背景色
  
  // 次要色调 (Secondary)
  secondary: '#2d3436',        // 次要色 - 深灰
  secondaryLight: '#636e72',    // 次要色浅色
  secondaryBackground: '#f5f5f5', // 次要背景色
  
  // 语义色 (Semantic)
  success: '#00b894',           // 成功 - 绿色
  warning: '#fdcb6',           // 警告 - 黄色
  error: '#d63031',            // 错误 - 红色
  info: '#0984e3',             // 信息 - 蓝色
  
  // 中性色 (Neutral)
  white: '#ffffff',
  gray50: '#f9f9f9',
  gray100: '#f5f5f5',
  gray200: '#eeeeee',
  gray300: '#e0e0e0',
  gray400: '#bdbdbd',
  gray500: '#9e9e9e',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  black: '#000000',
  
  // 文本色 (Text)
  textPrimary: '#333333',       // 主要文本
  textSecondary: '#666666',     // 次要文本
  textTertiary: '#999999',     // 辅助文本
  textInverse: '#ffffff',       // 反色文本
  
  // 背景色 (Background)
  backgroundPrimary: '#ffffff',  // 主要背景
  backgroundSecondary: '#f5f5f5', // 次要背景
  backgroundTertiary: '#f9f9f9', // 第三背景
  
  // 边框色 (Border)
  borderLight: '#eeeeee',
  borderMedium: '#e0e0e0',
  borderDark: '#bdbdbd',
  
  // 阴影色 (Shadow)
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
};

// ==================== 字体系统 ====================
export const Typography = {
  // 字体家族
  fontFamily: {
    primary: 'System',          // 系统字体
    secondary: 'System',        // 辅助字体
  },
  
  // 字体大小 (Font Size) - 基于 4px 网格
  fontSize: {
    xs: 12,                   // 辅助文本
    sm: 14,                   // 正文小
    base: 16,                  // 正文
    lg: 18,                   // 标题小
    xl: 20,                   // 标题中
    '2xl': 24,                // 标题大
    '3xl': 30,                // 展示大
    '4xl': 36,                // 展示特大
  },
  
  // 字体粗细 (Font Weight)
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // 行高 (Line Height)
  lineHeight: {
    tight: 1.2,               // 标题
    normal: 1.5,              // 正文
    relaxed: 1.75,            // 辅助文本
  },
  
  // 字间距 (Letter Spacing)
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
};

// ==================== 间距系统 ====================
export const Spacing = {
  // 基于 4px 网格的间距系统
  1: 4,                       // 微间距
  2: 8,                       // 小间距
  3: 12,                      // 中间距
  4: 16,                      // 标准间距
  5: 20,                      // 中大间距
  6: 24,                      // 大间距
  8: 32,                      // 超大间距
  10: 40,                     // 巨大间距
  12: 48,                     // 特大幅距
  16: 64,                     // 顶级间距
};

// ==================== 圆角系统 ====================
export const BorderRadius = {
  none: 0,
  sm: 4,                      // 小圆角
  base: 8,                    // 标准圆角
  md: 12,                     // 中圆角
  lg: 16,                     // 大圆角
  xl: 24,                     // 超大圆角
  full: 9999,                 // 圆形
};

// ==================== 阴影系统 ====================
export const Shadows = {
  // 阴影 1 - 微小阴影
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // 阴影 2 - 小阴影
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  
  // 阴影 3 - 中等阴影
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // 阴影 4 - 大阴影
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  
  // 阴影 5 - 超大阴影
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
};

// ==================== 动画系统 ====================
export const Animation = {
  // 动画持续时间
  duration: {
    fast: 150,                // 快速动画
    normal: 300,               // 标准动画
    slow: 500,                // 慢速动画
  },
  
  // 动画缓动函数
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    linear: 'linear',
  },
};

// ==================== 断点系统 (响应式) ====================
export const Breakpoints = {
  mobile: 320,                 // 手机
  mobileLarge: 375,             // 大手机
  tablet: 768,                 // 平板
  desktop: 1024,               // 桌面
  wide: 1280,                 // 宽屏
};

// ==================== 可访问性 ====================
export const Accessibility = {
  // 最小触摸目标尺寸 (WCAG 标准)
  minTouchTarget: 44,
  
  // 颜色对比度 (WCAG AA 标准)
  minContrastRatio: 4.5,
  
  // 焦点指示器
  focusOutline: {
    width: 2,
    color: Colors.info,
    offset: 2,
  },
};

// ==================== 导出默认主题 ====================
export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Animation,
  Breakpoints,
  Accessibility,
};
