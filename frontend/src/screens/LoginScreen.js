import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Image
} from 'react-native';
import { authApi } from '../api';
import { authStore } from '../store/authStore';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }
    try {
      await authApi.sendCode(phone);
      setCountdown(60);
      Alert.alert('验证码已发送', '请在服务器日志中查看验证码');
    } catch (err) {
      Alert.alert('发送失败', err.message);
    }
  };

  const handleAuth = async () => {
    if (loading) return;
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        if (!password) {
          Alert.alert('提示', '请输入密码');
          setLoading(false);
          return;
        }
        result = await authApi.passwordLogin({ phone, password });
      } else {
        if (!code) {
          Alert.alert('提示', '请输入验证码');
          setLoading(false);
          return;
        }
        result = await authApi.smsLogin({ phone, code });
      }

      global.token = result.data.token;
      global.userInfo = result.data.user;
      authStore.setState({ isLoggedIn: true, user: result.data.user, token: result.data.token });

      Alert.alert('登录成功', `欢迎，${result.data.user.nickname}`);
      navigation.replace('Main');
    } catch (err) {
      Alert.alert('登录失败', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Logo区域 */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🛒</Text>
          </View>
          <Text style={styles.appName}>好物商城</Text>
          <Text style={styles.tagline}>品质生活，从这里开始</Text>
        </View>

        {/* 登录/注册切换 */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, !isLogin && styles.activeTab]}
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>验证码登录</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, isLogin && styles.activeTab]}
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.tabText, isLogin && styles.activeTabText]}>密码登录</Text>
          </TouchableOpacity>
        </View>

        {/* 表单 */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>手机号</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入手机号"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          {isLogin ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>密码</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入密码"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          ) : (
            <View style={styles.codeRow}>
              <View style={styles.codeInput}>
                <Text style={styles.label}>验证码</Text>
                <TextInput
                  style={styles.input}
                  placeholder="请输入验证码"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, countdown > 0 && styles.sendBtnDisabled]}
                onPress={handleSendCode}
                disabled={countdown > 0}
              >
                <Text style={styles.sendBtnText}>
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnLoading]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.submitText}>
              {loading ? '登录中...' : isLogin ? '登 录' : '注 册'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 测试账号 */}
        <View style={styles.testAccount}>
          <Text style={styles.testLabel}>测试账号：</Text>
          <Text style={styles.testText}>手机号：13800138000</Text>
          <Text style={styles.testText}>密 码：123456</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 80 },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff3ed', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoText: { fontSize: 40 },
  appName: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  tagline: { fontSize: 14, color: '#999', marginTop: 8 },
  tabs: { flexDirection: 'row', marginBottom: 32, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 15, color: '#666' },
  activeTabText: { color: '#ff6b35', fontWeight: '600' },
  form: { gap: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, color: '#333', marginBottom: 8, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, backgroundColor: '#fafafa' },
  codeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  codeInput: { flex: 1 },
  sendBtn: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#ff6b35', borderRadius: 8, justifyContent: 'center', minHeight: 48 },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  submitBtn: { backgroundColor: '#ff6b35', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  submitBtnLoading: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  testAccount: { marginTop: 32, padding: 16, backgroundColor: '#f0f9ff', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#3b82f6' },
  testLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  testText: { fontSize: 13, color: '#334155', marginTop: 4 },
});
