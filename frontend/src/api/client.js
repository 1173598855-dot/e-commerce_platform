import axios from 'axios';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiBaseUrl, appDebug, errorCodes } from '../config/env';

const TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';

let accessToken = null;
let refreshToken = null;
let isRefreshing = false;
let failedQueue = [];

async function loadTokens() {
  try {
    const [access, refresh] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
    ]);
    accessToken = access;
    refreshToken = refresh;
    global.token = access;
    return { accessToken: access, refreshToken: refresh };
  } catch (err) {
    console.warn('[Auth] Failed to load tokens:', err.message);
    return { accessToken: null, refreshToken: null };
  }
}

async function saveTokens(access, refresh) {
  accessToken = access || null;
  refreshToken = refresh || refreshToken;
  global.token = accessToken;

  const writes = access !== undefined
    ? [AsyncStorage.setItem(TOKEN_KEY, access || '')]
    : [];
  if (refresh !== undefined) {
    writes.push(AsyncStorage.setItem(REFRESH_TOKEN_KEY, refresh || ''));
  }
  await Promise.all(writes);
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

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config) => {
    if (!accessToken) await loadTokens();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (appDebug) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

async function refreshAccessToken() {
  if (!refreshToken) throw new Error('Missing refresh token');

  const refreshApi = axios.create({
    baseURL: apiBaseUrl,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });

  const response = await refreshApi.post('/auth/refresh', { refreshToken });
  const data = response.data?.data || {};
  const newToken = data.accessToken || data.token;
  const newRefresh = data.refreshToken;

  if (!newToken) throw new Error('Failed to refresh token');

  await saveTokens(newToken, newRefresh);
  return newToken;
}

function isSuccessResponse(data) {
  return !!data && typeof data.code === 'number' && data.code === 200;
}

api.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data && typeof data.code === 'number') {
      if (isSuccessResponse(data)) return data;
      return Promise.reject({
        code: data.code,
        message: data.message || 'Request failed',
        requestId: data.requestId,
      });
    }
    return data;
  },
  async (error) => {
    const { config, response } = error;

    if (!response) {
      console.error('[API] Network error:', error.message);
      return Promise.reject({ code: 0, message: 'Network unavailable' });
    }

    const { status, data } = response;
    const serverCode = data?.code;
    const requestId = response.headers?.['x-request-id'] || 'N/A';

    if (status === 401 && (serverCode === errorCodes.tokenExpired || serverCode === errorCodes.tokenInvalid)) {
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
        Alert.alert('Session expired', 'Please sign in again.', [
          { text: 'OK', onPress: () => global.onTokenExpired?.() },
        ]);
        return Promise.reject({ code: errorCodes.tokenExpired, message: 'Session expired' });
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401 && serverCode === errorCodes.kickedOut) {
      await clearTokens();
      Alert.alert('Account notice', data?.message || 'Your account signed in elsewhere.', [
        { text: 'Sign in', onPress: () => global.onTokenExpired?.() },
      ]);
      return Promise.reject({ code: errorCodes.kickedOut, message: data?.message });
    }

    if (status === 429) {
      return Promise.reject({
        code: serverCode || errorCodes.rateLimited,
        message: data?.message || 'Too many requests. Try again later.',
      });
    }

    const message = data?.message || `Request failed (${status})`;
    console.error(`[API ERROR] status=${status} code=${serverCode} requestId=${requestId} message=${message}`);

    return Promise.reject({
      code: serverCode || status,
      message,
      requestId,
    });
  }
);

loadTokens();

export { api, loadTokens, saveTokens, clearTokens, TOKEN_KEY, REFRESH_TOKEN_KEY, errorCodes };
export default api;
