/**
 * 认证状态管理 Store
 * 使用 Zustand 管理用户认证状态
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { User, AuthState, LoginParams, RegisterParams } from '../types';

interface AuthStore extends AuthState {
  // 操作方法
  login: (params: LoginParams) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserInfo: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  // 初始状态
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // 登录
  login: async (params: LoginParams) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>('/api/auth/login', params);

      const { accessToken, refreshToken, user } = response;

      // 存储 Token
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || '登录失败',
      });
      throw error;
    }
  },

  // 注册
  register: async (params: RegisterParams) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>('/api/auth/register', params);

      const { accessToken, refreshToken, user } = response;

      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || '注册失败',
      });
      throw error;
    }
  },

  // 登出
  logout: async () => {
    set({ isLoading: true });
    
    try {
      // 调用后端登出接口
      await api.post('/api/auth/logout');
    } catch (error) {
      // 忽略错误，继续清除本地数据
    } finally {
      // 清除本地存储
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userInfo']);
      
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  // 刷新用户信息
  refreshUserInfo: async () => {
    if (!get().isAuthenticated) return;

    set({ isLoading: true });
    
    try {
      const user = await api.get<User>('/api/user/profile');
      
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      
      set({
        user,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || '获取用户信息失败',
      });
    }
  },

  // 更新个人资料
  updateProfile: async (data: Partial<User>) => {
    set({ isLoading: true, error: null });
    
    try {
      const updatedUser = await api.put<User>('/api/user/profile', data);
      
      await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUser));
      
      set({
        user: updatedUser,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || '更新失败',
      });
      throw error;
    }
  },

  // 检查认证状态
  checkAuth: async () => {
    try {
      // 优先从 AsyncStorage 获取用户信息
      const [accessToken, userInfoStr] = await AsyncStorage.multiGet(['accessToken', 'userInfo']);
      
      if (accessToken[1] && userInfoStr[1]) {
        const user = JSON.parse(userInfoStr[1]);
        
        // 验证 Token 是否有效
        try {
          await api.get('/api/auth/verify');
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error) {
          // Token 无效，尝试刷新
          // 这里会触发拦截器的自动刷新逻辑
        }
      }
      
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));

// 初始化时检查认证状态
AsyncStorage.getItem('userInfo').then((userInfoStr) => {
  if (userInfoStr) {
    const user = JSON.parse(userInfoStr);
    useAuthStore.setState({
      user,
      isAuthenticated: true,
    });
  }
});
