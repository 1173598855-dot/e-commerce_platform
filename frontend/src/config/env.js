import { Platform } from 'react-native';

const DEFAULT_DEV_API_BASE_URL = Platform.OS === 'ios'
  ? 'http://localhost:4100/api'
  : 'http://10.0.2.2:4100/api';

const DEFAULT_PROD_API_BASE_URL = 'https://api.xiaoyimall.com/api';

function readGlobalConfig() {
  const globalConfig = global.__APP_CONFIG__ || {};
  return {
    appEnv: globalConfig.appEnv,
    apiBaseUrl: globalConfig.apiBaseUrl,
    appDebug: globalConfig.appDebug,
  };
}

function getAppEnv() {
  const globalConfig = readGlobalConfig();
  if (globalConfig.appEnv) return globalConfig.appEnv;
  if (typeof process !== 'undefined' && process.env?.APP_ENV) return process.env.APP_ENV;
  return typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production';
}

function getApiBaseUrl() {
  const globalConfig = readGlobalConfig();
  if (globalConfig.apiBaseUrl) return globalConfig.apiBaseUrl;
  if (typeof process !== 'undefined' && process.env?.API_BASE_URL) return process.env.API_BASE_URL;
  return getAppEnv() === 'production' ? DEFAULT_PROD_API_BASE_URL : DEFAULT_DEV_API_BASE_URL;
}

function isDebugEnabled() {
  const globalConfig = readGlobalConfig();
  if (typeof globalConfig.appDebug === 'boolean') return globalConfig.appDebug;
  if (typeof process !== 'undefined' && process.env?.APP_DEBUG) return process.env.APP_DEBUG === 'true';
  return typeof __DEV__ !== 'undefined' ? __DEV__ : true;
}

export const appEnv = getAppEnv();
export const apiBaseUrl = getApiBaseUrl();
export const appDebug = isDebugEnabled();
export const errorCodes = {
  tokenExpired: 30001,
  tokenInvalid: 30002,
  kickedOut: 30020,
  rateLimited: 50003,
};
