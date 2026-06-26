import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// ==================== 配置 ====================
const API_BASE_URL = process.env.API_BASE_URL || 'http://10.0.2.2:4000/api';
const APP_ENV = process.env.APP_ENV || 'development';

// ==================== 错误码定义（与后端一致）====================
const ERROR_CODES = {
  UNAUTHORIZED:          30000,
  TOKEN_EXPIRED:         30001,
  TOKEN_INVALID:         30002,
  TOKEN_REFRESH_EXPIRED: 30003,
  KICKED_OUT:            30020,
  RATE_LIMITED:          50003,
};

// ==================== Token 管理 ====================
let accessToken = null;
let refreshToken = null;
let isRefreshing = false;
let failedQueue = [];

const TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';

// 初始化时从 AsyncStorage 恢复 token
async function loadTokens() {
  try {
    const [access, refresh] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
    ]);
    accessToken = access;
    refreshToken = refresh;
    global.token = access;
  } catch (e) {
    console.warn('[Auth] 加载token失败:', e.message);
  }
}

async function saveTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh || refreshToken;
  global.token = access;
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, access),
    refresh ? AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh) : Promise.resolve(),
  ]);
}

async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  global.token = null;
  global.userInfo = null;
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
  ]);
}

// ==================== 请求队列（刷新token期间排队）====================
function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

// ==================== Axios 实例 ====================
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ==================== 请求拦截器 ====================
api.interceptors.request.use(
  async (config) => {
    // 每次请求前确保 token 已加载
    if (!accessToken) {
      await loadTokens();
    }
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // 开发环境打印请求日志
    if (APP_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==================== Token 刷新 ====================
async function refreshAccessToken() {
  if (!refreshToken) {
    throw new Error('无refreshToken');
  }

  const refreshApi = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  });

  const response = await refreshApi.post('/auth/refresh', {
    refreshToken,
  });

  const { token: newToken, refreshToken: newRefresh } = response.data?.data || {};
  if (!newToken) throw new Error('刷新token失败');

  await saveTokens(newToken, newRefresh);
  return newToken;
}

// ==================== 响应拦截器 ====================
api.interceptors.response.use(
  (response) => {
    const data = response.data;

    // 后端统一格式: { success, code, message, data, requestId }
    if (data && typeof data.code === 'number') {
      if (data.code >= 10000 && data.code < 20000) {
        // 成功
        return data;
      }
      // 业务错误（非网络错误），直接 reject
      return Promise.reject({
        code: data.code,
        message: data.message || '请求失败',
        requestId: data.requestId,
      });
    }

    // 兼容旧格式: { success, message, data }
    return data;
  },
  async (error) => {
    const { config, response } = error;

    if (!response) {
      // 网络错误
      console.error('[API] 网络错误:', error.message);
      return Promise.reject({ code: 0, message: '网络连接失败，请检查网络' });
    }

    const { status, data } = response;
    const serverCode = data?.code;
    const requestId = response.headers?.['x-request-id'] || 'N/A';

    // ---- Token 过期自动刷新 ----
    if (status === 401 && (serverCode === ERROR_CODES.TOKEN_EXPIRED || serverCode === ERROR_CODES.TOKEN_INVALID)) {
      // 如果正在刷新，排队等待
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          config.headers.Authorization = `Bearer ${token}`;
          return api(config);
        });
      }

      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearTokens();
        Alert.alert('登录已过期', '请重新登录', [
          { text: '确定', onPress: () => {
            // 通过全局事件通知导航器跳转登录页
            if (global.onTokenExpired) global.onTokenExpired();
          }},
        ]);
        return Promise.reject({ code: ERROR_CODES.TOKEN_EXPIRED, message: '登录已过期' });
      } finally {
        isRefreshing = false;
      }
    }

    // ---- 被顶号 ----
    if (status === 401 && serverCode === ERROR_CODES.KICKED_OUT) {
      await clearTokens();
      Alert.alert('账号提示', data?.message || '您的账号在其他设备登录', [
        { text: '重新登录', onPress: () => {
          if (global.onTokenExpired) global.onTokenExpired();
        }},
      ]);
      return Promise.reject({ code: ERROR_CODES.KICKED_OUT, message: data?.message });
    }

    // ---- 限流 ----
    if (status === 429) {
      return Promise.reject({ code: serverCode || ERROR_CODES.RATE_LIMITED, message: data?.message || '请求过于频繁，请稍后再试' });
    }

    // ---- 其他 HTTP 错误 ----
    const message = data?.message || `请求失败(${status})`;
    console.error(`[API ERROR] status=${status} code=${serverCode} requestId=${requestId} message=${message}`);

    return Promise.reject({
      code: serverCode || status,
      message,
      requestId,
    });
  }
);

// ==================== 初始化 ====================
loadTokens();

// ==================== 导出 ====================
export { loadTokens, saveTokens, clearTokens };
export default api;
