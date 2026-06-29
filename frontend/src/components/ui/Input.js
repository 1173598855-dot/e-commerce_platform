/**
 * 统一输入框组件 (Unified Input Component)
 * 遵循 UI 设计方案 v2.0.0
 * 支持多种类型、状态和验证
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Typography, Spacing, BorderRadius } from '../theme/designSystem';

const Input = ({
  label = null,
  placeholder = null,
  value = null,
  onChangeText = null,
  onBlur = null,
  onFocus = null,
  error = null,
  disabled = false,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  returnKeyType = 'done',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  leftIcon = null,
  rightIcon = null,
  onRightIconPress = null,
  style = null,
  inputStyle = null,
  containerStyle = null,
  accessibilityLabel = null,
  accessibilityHint = null,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleFocus = useCallback((e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  }, [onFocus]);

  const handleBlur = useCallback((e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  }, [onBlur]);

  const togglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible(!isPasswordVisible);
  }, [isPasswordVisible]);

  const getContainerStyle = () => {
    let baseStyle = [styles.container, containerStyle];
    
    if (isFocused) {
      baseStyle.push(styles.containerFocused);
    }
    
    if (error) {
      baseStyle.push(styles.containerError);
    }
    
    if (disabled) {
      baseStyle.push(styles.containerDisabled);
    }
    
    return baseStyle;
  };

  const renderLeftIcon = () => {
    if (!leftIcon) return null;
    
    return (
      <View style={styles.leftIcon}>
        <Icon name={leftIcon} size={20} color={Colors.textTertiary} />
      </View>
    );
  };

  const renderRightIcon = () => {
    if (secureTextEntry) {
      return (
        <TouchableOpacity
          style={styles.rightIcon}
          onPress={togglePasswordVisibility}
          accessibilityLabel={isPasswordVisible ? '隐藏密码' : '显示密码'}
        >
          <Icon
            name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={Colors.textTertiary}
          />
        </TouchableOpacity>
      );
    }
    
    if (rightIcon) {
      return (
        <TouchableOpacity
          style={styles.rightIcon}
          onPress={onRightIconPress}
          disabled={!onRightIconPress}
        >
          <Icon name={rightIcon} size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
      );
    }
    
    return null;
  };

  return (
    <View style={[styles.wrapper, style]}>
      {/* 标签 */}
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}
      
      {/* 输入框容器 */}
      <View style={getContainerStyle()}>
        {renderLeftIcon()}
        
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={!disabled}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityRole="text"
          accessibilityState={{ disabled }}
        />
        
        {renderRightIcon()}
      </View>
      
      {/* 错误提示 */}
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={14} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing[3],
  },
  
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing[1],
  },
  
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing[3],
    minHeight: 44,
  },
  
  containerFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  
  containerError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  
  containerDisabled: {
    backgroundColor: Colors.gray100,
  },
  
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    paddingVertical: Spacing[2],
  },
  
  inputMultiline: {
    textAlignVertical: 'top',
    paddingVertical: Spacing[2],
  },
  
  leftIcon: {
    marginRight: Spacing[2],
  },
  
  rightIcon: {
    marginLeft: Spacing[2],
    padding: Spacing[1],
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[1],
    gap: Spacing[1],
  },
  
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
  },
});

export default Input;
