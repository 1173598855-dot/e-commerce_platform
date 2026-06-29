/**
 * 登录页面
 * 支持手机号+验证码、密码登录、生物识别
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useAuthStore } from '../store/useAuthStore';
import { theme } from '../theme';
import { LoginParams } from '../types';

type LoginType = 'password' | 'sms';

const LoginScreen: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const [loginType, setLoginType] = useState<LoginType>('password');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  // 发送验证码
  const sendSmsCode = async () => {
    if (!phone || phone.length !== 11) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    try {
      // 调用发送验证码接口
      await fetch(`${API_BASE_URL}/api/auth/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      Alert.alert('成功', '验证码已发送');
      
      // 倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      Alert.alert('错误', '发送验证码失败');
    }
  };

  // 登录
  const handleLogin = async () => {
    if (!phone) {
      Alert.alert('提示', '请输入手机号');
      return;
    }

    if (loginType === 'password' && !password) {
      Alert.alert('提示', '请输入密码');
      return;
    }

    if (loginType === 'sms' && !smsCode) {
      Alert.alert('提示', '请输入验证码');
      return;
    }

    try {
      const params: LoginParams = {
        phone,
        ...(loginType === 'password' ? { password } : { smsCode }),
      };

      await login(params);
    } catch (error: any) {
      Alert.alert('登录失败', error.message || '请重试');
    }
  };

  // 生物识别登录
  const handleBiometricLogin = async () => {
    // TODO: 实现生物识别登录
    Alert.alert('提示', '生物识别登录功能开发中');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Icon name="shopping-bag" size={80} color={theme.colors.primary} />
          <Text style={styles.appName}>E-Commerce</Text>
          <Text style={styles.slogan}>一站式购物体验</Text>
        </View>

        {/* 登录方式切换 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, loginType === 'password' && styles.activeTab]}
            onPress={() => setLoginType('password')}
          >
            <Text style={[styles.tabText, loginType === 'password' && styles.activeTabText]}>
              密码登录
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, loginType === 'sms' && styles.activeTab]}
            onPress={() => setLoginType('sms')}
          >
            <Text style={[styles.tabText, loginType === 'sms' && styles.activeTabText]}>
              验证码登录
            </Text>
          </TouchableOpacity>
        </View>

        {/* 表单 */}
        <View style={styles.formContainer}>
          {/* 手机号 */}
          <View style={styles.inputContainer}>
            <Icon name="mobile-alt" size={20} color={theme.colors.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="请输入手机号"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={11}
              autoComplete="tel"
            />
          </View>

          {/* 密码 */}
          {loginType === 'password' && (
            <View style={styles.inputContainer}>
              <Icon name="lock" size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="请输入密码"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>
          )}

          {/* 验证码 */}
          {loginType === 'sms' && (
            <View style={styles.inputContainer}>
              <Icon name="sms" size={20} color={theme.colors.gray} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.smsInput]}
                placeholder="请输入验证码"
                value={smsCode}
                onChangeText={setSmsCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.smsButton, countdown > 0 && styles.smsButtonDisabled]}
                onPress={sendSmsCode}
                disabled={countdown > 0}
              >
                <Text style={styles.smsButtonText}>
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 错误提示 */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* 登录按钮 */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>登录</Text>
            )}
          </TouchableOpacity>

          {/* 生物识别登录 */}
          <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin}>
            <Icon name="fingerprint" size={24} color={theme.colors.primary} />
            <Text style={styles.biometricText}>生物识别登录</Text>
          </TouchableOpacity>
        </View>

        {/* 注册入口 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>还没有账号？</Text>
          <TouchableOpacity>
            <Text style={styles.registerLink}>立即注册</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 16,
  },
  slogan: {
    fontSize: 16,
    color: theme.colors.gray,
    marginTop: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    color: theme.colors.gray,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
    backgroundColor: theme.colors.background,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  smsInput: {
    flex: 1,
  },
  smsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  smsButtonDisabled: {
    backgroundColor: theme.colors.gray,
  },
  smsButtonText: {
    color: theme.colors.white,
    fontSize: 14,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  loginButton: {
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    padding: 12,
  },
  biometricText: {
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  registerLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default LoginScreen;
