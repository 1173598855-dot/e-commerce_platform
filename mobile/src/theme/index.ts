/**
 * 主题配置
 * 统一应用视觉风格
 */

import { Platform } from 'react-native';

export const theme = {
  // 主色调
  colors: {
    primary: '#FF4400', // 主题红
    secondary: '#FF6B35', // 辅助橙
    success: '#52C41A', // 成功绿
    warning: '#FAAD14', // 警告黄
    error: '#FF4400', // 错误红
    info: '#1890FF', // 信息蓝

    // 文本色
    text: '#333333',
    textSecondary: '#666666',
    textLight: '#999999',

    // 背景色
    background: '#F5F5F5',
    white: '#FFFFFF',
    black: '#000000',

    // 边框/分割线
    border: '#E8E8E8',
    divider: '#EEEEEE',

    // 灰色
    gray: '#999999',
    grayLight: '#CCCCCC',
    grayDark: '#666666',

    // 遮罩
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // 字体大小
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    title: 32,
  },

  // 间距
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // 圆角
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 9999,
  },

  // 阴影
  shadows: {
    light: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
    medium: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    heavy: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // 布局
  layout: {
    maxWidth: 1200,
    minWidth: 320,
    headerHeight: Platform.select({ ios: 44, android: 56 }),
    tabBarHeight: Platform.select({ ios: 88, android: 60 }),
    statusBarHeight: Platform.select({ ios: 20, android: 24 }),
  },

  // 动画
  animation: {
    defaultDuration: 300,
    fastDuration: 150,
    slowDuration: 500,
  },
};

export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
