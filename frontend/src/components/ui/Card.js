/**
 * 统一卡片组件 (Unified Card Component)
 * 遵循 UI 设计方案 v2.0.0
 * 支持多种变体和样式
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/designSystem';

const Card = ({
  children,
  onPress = null,
  variant = 'default', // 'default' | 'outlined' | 'elevated'
  padding = true,
  style = null,
  contentStyle = null,
  header = null,
  footer = null,
  accessibilityLabel = null,
}) => {
  const getCardStyle = () => {
    let baseStyle = [styles.base];
    
    switch (variant) {
      case 'outlined':
        baseStyle.push(styles.outlined);
        break;
      case 'elevated':
        baseStyle.push(styles.elevated);
        break;
      default:
        baseStyle.push(styles.default);
    }
    
    if (style) {
      baseStyle.push(style);
    }
    
    return baseStyle;
  };

  const renderContent = () => (
    <View style={[styles.content, padding && styles.contentPadded, contentStyle]}>
      {header && (
        <View style={styles.header}>
          {header}
        </View>
      )}
      
      <View style={styles.body}>
        {children}
      </View>
      
      {footer && (
        <View style={styles.footer}>
          {footer}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={getCardStyle()}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return (
    <View style={getCardStyle()}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    marginBottom: Spacing[2],
  },
  
  // 变体
  default: {
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  outlined: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  elevated: {
    backgroundColor: Colors.white,
    ...Shadows.md,
  },
  
  // 内容
  content: {
    flex: 1,
  },
  contentPadded: {
    padding: Spacing[4],
  },
  
  // 头部
  header: {
    padding: Spacing[4],
    paddingBottom: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  
  // 主体
  body: {
    flex: 1,
  },
  
  // 底部
  footer: {
    padding: Spacing[4],
    paddingTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});

export default Card;
