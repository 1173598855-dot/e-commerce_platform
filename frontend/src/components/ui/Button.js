/**
 * 统一按钮组件 (Unified Button Component)
 * 遵循 UI 设计方案 v2.0.0
 * 支持多种变体、尺寸和状态
 */

import React, { useCallback } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/designSystem';

const Button = ({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left', // 'left' | 'right'
  fullWidth = false,
  style = null,
  textStyle = null,
  accessibilityLabel = null,
  accessibilityHint = null,
}) => {
  const handlePress = useCallback(() => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  }, [disabled, loading, onPress]);

  const getButtonStyle = () => {
    let baseStyle = [styles.base, styles[size]];
    
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primary);
        break;
      case 'secondary':
        baseStyle.push(styles.secondary);
        break;
      case 'danger':
        baseStyle.push(styles.danger);
        break;
      case 'ghost':
        baseStyle.push(styles.ghost);
        break;
      case 'link':
        baseStyle.push(styles.link);
        break;
      default:
        baseStyle.push(styles.primary);
    }
    
    if (disabled) {
      baseStyle.push(styles.disabled);
    }
    
    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }
    
    if (style) {
      baseStyle.push(style);
    }
    
    return baseStyle;
  };

  const getTextStyle = () => {
    let baseStyle = [styles.text, styles[`${size}Text`]];
    
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primaryText);
        break;
      case 'secondary':
        baseStyle.push(styles.secondaryText);
        break;
      case 'danger':
        baseStyle.push(styles.dangerText);
        break;
      case 'ghost':
        baseStyle.push(styles.ghostText);
        break;
      case 'link':
        baseStyle.push(styles.linkText);
        break;
      default:
        baseStyle.push(styles.primaryText);
    }
    
    if (disabled) {
      baseStyle.push(styles.disabledText);
    }
    
    if (textStyle) {
      baseStyle.push(textStyle);
    }
    
    return baseStyle;
  };

  const renderIcon = (position) => {
    if (!icon || iconPosition !== position) return null;
    
    return (
      <View style={[styles.icon, loading && position === 'left' && styles.iconHidden]}>
        <Icon name={icon} size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18} />
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? Colors.white : Colors.primary}
          style={styles.loader}
        />
      )}
      
      {renderIcon('left')}
      
      <Text style={getTextStyle()}>
        {loading ? '加载中...' : title}
      </Text>
      
      {renderIcon('right')}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.base,
    ...(Platform.OS === 'ios' ? { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 } : {}),
  },
  
  // 尺寸
  sm: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    minHeight: 32,
  },
  md: {
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    minHeight: 44,
  },
  lg: {
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[6],
    minHeight: 52,
  },
  
  // 变体
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  danger: {
    backgroundColor: Colors.error,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  link: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  
  // 禁用状态
  disabled: {
    opacity: 0.6,
  },
  
  // 全宽
  fullWidth: {
    width: '100%',
  },
  
  // 文本样式
  text: {
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  smText: {
    fontSize: Typography.fontSize.sm,
  },
  mdText: {
    fontSize: Typography.fontSize.base,
  },
  lgText: {
    fontSize: Typography.fontSize.lg,
  },
  
  primaryText: {
    color: Colors.white,
  },
  secondaryText: {
    color: Colors.primary,
  },
  dangerText: {
    color: Colors.white,
  },
  ghostText: {
    color: Colors.primary,
  },
  linkText: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  
  disabledText: {
    opacity: 0.8,
  },
  
  // 图标
  icon: {
    marginHorizontal: Spacing[2],
  },
  iconHidden: {
    opacity: 0,
    width: 0,
  },
  
  // 加载指示器
  loader: {
    marginRight: Spacing[2],
  },
});

export default Button;
