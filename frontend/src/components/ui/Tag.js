/**
 * 统一标签组件 (Unified Tag Component)
 * 遵循 UI 设计方案 v2.0.0
 * 支持多种变体和尺寸
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/designSystem';

const Tag = ({
  text,
  onPress = null,
  variant = 'default', // 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  size = 'md', // 'sm' | 'md' | 'lg'
  closable = false,
  onClose = null,
  style = null,
  textStyle = null,
  accessibilityLabel = null,
}) => {
  const getTagStyle = () => {
    let baseStyle = [styles.base, styles[size]];
    
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primary);
        break;
      case 'success':
        baseStyle.push(styles.success);
        break;
      case 'warning':
        baseStyle.push(styles.warning);
        break;
      case 'error':
        baseStyle.push(styles.error);
        break;
      case 'info':
        baseStyle.push(styles.info);
        break;
      default:
        baseStyle.push(styles.default);
    }
    
    if (style) {
      baseStyle.push(style);
    }
    
    return baseStyle;
  };

  const getTextStyle = () => {
    let baseStyle = [styles.text, styles[`${size}Text`]];
    
    switch (variant) {
      case 'default':
        baseStyle.push(styles.defaultText);
        break;
      case 'primary':
        baseStyle.push(styles.primaryText);
        break;
      case 'success':
        baseStyle.push(styles.successText);
        break;
      case 'warning':
        baseStyle.push(styles.warningText);
        break;
      case 'error':
        baseStyle.push(styles.errorText);
        break;
      case 'info':
        baseStyle.push(styles.infoText);
        break;
      default:
        baseStyle.push(styles.defaultText);
    }
    
    if (textStyle) {
      baseStyle.push(textStyle);
    }
    
    return baseStyle;
  };

  const renderContent = () => (
    <>
      <Text style={getTextStyle()}>
        {text}
      </Text>
      
      {closable && (
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          accessibilityLabel="关闭标签"
        >
          <Text style={[getTextStyle(), styles.closeIcon]}>×</Text>
        </TouchableOpacity>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={getTagStyle()}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel || text}
        accessibilityRole="button"
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return (
    <View style={getTagStyle()}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
  },
  
  // 尺寸
  sm: {
    paddingHorizontal: Spacing[1],
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
  },
  lg: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  
  // 变体
  default: {
    backgroundColor: Colors.gray100,
  },
  primary: {
    backgroundColor: Colors.primaryBackground,
  },
  success: {
    backgroundColor: Colors.success + '20',
  },
  warning: {
    backgroundColor: Colors.warning + '20',
  },
  error: {
    backgroundColor: Colors.error + '20',
  },
  info: {
    backgroundColor: Colors.info + '20',
  },
  
  // 文本样式
  text: {
    fontWeight: Typography.fontWeight.medium,
  },
  smText: {
    fontSize: Typography.fontSize.xs - 2,
  },
  mdText: {
    fontSize: Typography.fontSize.xs,
  },
  lgText: {
    fontSize: Typography.fontSize.sm,
  },
  
  defaultText: {
    color: Colors.textSecondary,
  },
  primaryText: {
    color: Colors.primary,
  },
  successText: {
    color: Colors.success,
  },
  warningText: {
    color: Colors.warning,
  },
  errorText: {
    color: Colors.error,
  },
  infoText: {
    color: Colors.info,
  },
  
  // 关闭按钮
  closeBtn: {
    marginLeft: Spacing[1],
    padding: 2,
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.bold,
  },
});

export default Tag;
