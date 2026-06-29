import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { loadTokens, clearTokens } from './src/api/request';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    try {
      // 恢复登录状态
      await loadTokens();
      // 检查是否已登录
      if (global.token) {
        setInitialRoute('Main');
      } else {
        setInitialRoute('Login');
      }
    } catch (e) {
      console.error('[App] 初始化失败:', e.message);
      setInitialRoute('Login');
    }
    setIsReady(true);
  }

  if (!isReady || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#ff6b35" />
        <Text style={{ marginTop: 12, color: '#999', fontSize: 14 }}>小奕商城加载中...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator initialRoute={initialRoute} />
    </SafeAreaProvider>
  );
}
