/**
 * API 客户端配置
 * 统一网络请求层，支持 Token 管理、请求重试、离线缓存
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL, API_TIMEOUT } from '@env';

// 从环境变量获取配置
const BASE_URL = API_BASE_URL || 'http://localhost:8080';
const TIMEOUT = parseInt(API_TIMEOUT || '30000', 10);

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.instance = axios.create({
      baseURL: BASE_URL,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Platform': Platform.OS,
        'App-Version': '1.0.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // 请求拦截器 - 添加 Token
    this.instance.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器 - Token 刷新
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // 统一响应格式处理
        const { data } = response;
        
        // 后端返回格式: { code: number, data: any, message: string }
        // 成功时 code === 200
        if (data.code !== 200) {
          return Promise.reject({
            code: data.code,
            message: data.message || '请求失败',
            data: data.data,
          });
        }
        
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Token 过期 (401) 且不是刷新 Token 的请求
        if (
          error.response?.status === 401 &&
          error.response?.data?.code === 401 &&
          !originalRequest._retry
        ) {
          if (this.isRefreshing) {
            // 正在刷新，将请求加入队列
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.instance(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshToken();
            this.processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            // 刷新失败，跳转到登录页
            await this.handleAuthFailure();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
      refreshToken,
    });

    const { accessToken, newRefreshToken } = response.data.data;
    
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', newRefreshToken);
    
    return accessToken;
  }

  private processQueue(error: any, token: string | null): void {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  private async handleAuthFailure(): Promise<void> {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userInfo']);
    // 导航到登录页 (需要在 App 层处理)
    // NavigationService.navigate('Login');
  }

  // 通用请求方法
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get(url, config);
    return response.data.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post(url, data, config);
    return response.data.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put(url, data, config);
    return response.data.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete(url, config);
    return response.data.data;
  }

  async upload<T>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const response = await this.instance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data.data;
  }
}

export const apiClient = new ApiClient();

// 导出便捷的 API 方法
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => apiClient.get<T>(url, config),
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.post<T>(url, data, config),
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.put<T>(url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) => apiClient.delete<T>(url, config),
  upload: <T>(url: string, formData: FormData, onProgress?: (progress: number) => void) =>
    apiClient.upload<T>(url, formData, onProgress),
};
