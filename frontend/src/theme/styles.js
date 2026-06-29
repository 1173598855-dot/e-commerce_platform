/**
 * 统一主题样式 (Unified Theme Styles)
 * 基于 designSystem.js 设计系统
 * 提供可复用的样式组件
 */

import { StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from './designSystem';

// ==================== 基础组件样式 ====================

// 容器样式
export const ContainerStyles = StyleSheet.create({
  // 主容器
  main: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  
  // 卡片容器
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    padding: Spacing[4],
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  
  // 卡片容器 (无内边距)
  cardNoPadding: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  
  // 分区容器
  section: {
    backgroundColor: Colors.white,
    marginBottom: Spacing[2],
    padding: Spacing[4],
  },
  
  // 行容器
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // 列容器
  column: {
    flexDirection: 'column',
  },
  
  // 居中容器
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // 空间 between
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

// 文本样式
export const TextStyles = StyleSheet.create({
  // 标题样式
  h1: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize['4xl'] * Typography.lineHeight.tight,
  },
  
  h2: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize['3xl'] * Typography.lineHeight.tight,
  },
  
  h3: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize['2xl'] * Typography.lineHeight.tight,
  },
  
  h4: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.tight,
  },
  
  // 正文样式
  body: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  
  bodySm: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
  
  // 辅助文本
  caption: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textTertiary,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.relaxed,
  },
  
  // 价格文本
  price: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  
  priceSm: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  
  // 原价文本
  originalPrice: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  
  // 标签文本
  tag: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.primary,
  },
});

// 按钮样式
export const ButtonStyles = StyleSheet.create({
  // 主按钮
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  
  primaryText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  
  // 次要按钮
  secondary: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  
  secondaryText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  
  // 危险按钮
  danger: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  dangerText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  
  // 小按钮
  small: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: BorderRadius.sm,
  },
  
  smallText: {
    fontSize: Typography.fontSize.sm,
  },
  
  // 禁用状态
  disabled: {
    opacity: 0.6,
  },
});

// 输入框样式
export const InputStyles = StyleSheet.create({
  // 基础输入框
  base: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  
  // 聚焦状态
  focused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  
  // 错误状态
  error: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  
  // 禁用状态
  disabled: {
    backgroundColor: Colors.gray100,
    color: Colors.textTertiary,
  },
  
  // 搜索框
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    gap: Spacing[2],
  },
  
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
});

// 卡片样式
export const CardStyles = StyleSheet.create({
  // 商品卡片
  product: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  
  productImage: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  productBody: {
    padding: Spacing[3],
  },
  
  productTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    marginBottom: Spacing[1],
  },
  
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing[1],
  },
  
  // 信息卡片
  info: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    padding: Spacing[4],
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  
  // 选项卡片
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
});

// 标签样式
export const TagStyles = StyleSheet.create({
  // 基础标签
  base: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryBackground,
  },
  
  // 促销标签
  promotion: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.error + '20', // 20% 透明度
  },
  
  promotionText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.error,
  },
});

// 导航样式
export const NavigationStyles = StyleSheet.create({
  // 底部导航
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingVertical: Spacing[1],
    height: 60,
  },
  
  // 顶部导航
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingHorizontal: Spacing[4],
    height: 48,
  },
  
  // 快速导航
  quickNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.white,
    paddingVertical: Spacing[2],
  },
  
  quickNavItem: {
    width: '16.66%',
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  
  quickNavIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[1],
  },
});

// 列表样式
export const ListStyles = StyleSheet.create({
  // 列表项
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  
  // 购物车项
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing[4],
    marginBottom: Spacing[2],
  },
  
  // 订单项
  orderItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    padding: Spacing[4],
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
});

// 底部操作栏样式
export const BottomBarStyles = StyleSheet.create({
  // 基础底部栏
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  
  // 操作按钮
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
  },
  
  // 主按钮
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing[2],
  },
  
  primaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  
  // 次要按钮
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing[2],
  },
  
  secondaryButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});

// ==================== 导出所有样式 ====================
export default {
  ContainerStyles,
  TextStyles,
  ButtonStyles,
  InputStyles,
  CardStyles,
  TagStyles,
  NavigationStyles,
  ListStyles,
  BottomBarStyles,
};
