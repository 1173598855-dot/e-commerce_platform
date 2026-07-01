function maskPhone(phone) {
  const value = String(phone || '');
  if (value.length < 7) return '***';
  return value.slice(0, 3) + '****' + value.slice(-4);
}

function buildSmsProviderConfig() {
  return {
    provider: (process.env.SMS_PROVIDER || 'console').toLowerCase(),
    signName: process.env.SMS_SIGN_NAME || '',
    templateCode: process.env.SMS_TEMPLATE_CODE || '',
    accessKeyId: process.env.SMS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET || '',
    endpoint: process.env.SMS_ENDPOINT || '',
    appId: process.env.SMS_APP_ID || '',
    consoleLogCode: process.env.SMS_CONSOLE_LOG_CODE === 'true',
  };
}

function validateSmsProviderConfig(config) {
  if (!config || config.provider === 'console') {
    return [];
  }

  const missing = [];
  if (!config.signName) missing.push('SMS_SIGN_NAME');
  if (!config.templateCode) missing.push('SMS_TEMPLATE_CODE');
  if (!config.accessKeyId) missing.push('SMS_ACCESS_KEY_ID');
  if (!config.accessKeySecret) missing.push('SMS_ACCESS_KEY_SECRET');
  if (config.provider === 'tencent' && !config.appId) missing.push('SMS_APP_ID');
  return missing;
}

async function sendSmsCode({ phone, code, logger = console.log }) {
  const config = buildSmsProviderConfig();
  const missing = validateSmsProviderConfig(config);

  if (config.provider === 'console') {
    const codePart = config.consoleLogCode ? ` code=${code}` : ' code=******';
    logger(`[SMS:console] phone=${maskPhone(phone)}${codePart}`);
    return { provider: 'console', delivered: true };
  }

  if (!['aliyun', 'tencent'].includes(config.provider)) {
    throw Object.assign(new Error(`Unsupported SMS_PROVIDER: ${config.provider}`), { httpStatus: 500 });
  }

  if (missing.length > 0) {
    throw Object.assign(new Error(`SMS provider ${config.provider} missing configuration: ${missing.join(', ')}`), { httpStatus: 500 });
  }

  throw Object.assign(new Error(`SMS provider ${config.provider} SDK integration is not implemented yet`), { httpStatus: 501 });
}

module.exports = {
  buildSmsProviderConfig,
  validateSmsProviderConfig,
  sendSmsCode,
};
