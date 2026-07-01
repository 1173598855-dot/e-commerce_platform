function buildPaymentProviderConfig() {
  return {
    provider: (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase(),
    callbackBaseUrl: process.env.PAYMENT_CALLBACK_BASE_URL || '',
    wechat: {
      mchId: process.env.WECHAT_PAY_MCH_ID || '',
      appId: process.env.WECHAT_PAY_APP_ID || '',
      apiV3Key: process.env.WECHAT_PAY_API_V3_KEY || '',
      certSerialNo: process.env.WECHAT_PAY_CERT_SERIAL_NO || '',
    },
    alipay: {
      appId: process.env.ALIPAY_APP_ID || '',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
      publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    },
  };
}

function validatePaymentProviderConfig(config) {
  if (!config || config.provider === 'mock') {
    return [];
  }

  const missing = [];
  if (!config.callbackBaseUrl) missing.push('PAYMENT_CALLBACK_BASE_URL');

  if (config.provider === 'wechat') {
    if (!config.wechat?.mchId) missing.push('WECHAT_PAY_MCH_ID');
    if (!config.wechat?.appId) missing.push('WECHAT_PAY_APP_ID');
    if (!config.wechat?.apiV3Key) missing.push('WECHAT_PAY_API_V3_KEY');
    if (!config.wechat?.certSerialNo) missing.push('WECHAT_PAY_CERT_SERIAL_NO');
  }

  if (config.provider === 'alipay') {
    if (!config.alipay?.appId) missing.push('ALIPAY_APP_ID');
    if (!config.alipay?.privateKey) missing.push('ALIPAY_PRIVATE_KEY');
    if (!config.alipay?.publicKey) missing.push('ALIPAY_PUBLIC_KEY');
  }

  return missing;
}

async function createPaymentTransaction({ orderId, orderNo, amount, paymentMethod }) {
  const config = buildPaymentProviderConfig();
  const provider = config.provider === 'mock' ? 'mock' : (paymentMethod || config.provider);
  const normalizedProvider = provider === 'wechatpay' ? 'wechat' : provider;
  const effectiveConfig = { ...config, provider: normalizedProvider };
  const missing = validatePaymentProviderConfig(effectiveConfig);

  if (normalizedProvider === 'mock') {
    return {
      provider: 'mock',
      paymentMethod,
      orderId,
      orderNo,
      amount,
      transactionId: 'MOCK-' + Date.now(),
    };
  }

  if (!['wechat', 'alipay'].includes(normalizedProvider)) {
    throw Object.assign(new Error(`Unsupported payment provider: ${normalizedProvider}`), { httpStatus: 400 });
  }

  if (missing.length > 0) {
    throw Object.assign(new Error(`Payment provider ${normalizedProvider} missing configuration: ${missing.join(', ')}`), { httpStatus: 500 });
  }

  throw Object.assign(new Error(`Payment provider ${normalizedProvider} SDK integration is not implemented yet`), { httpStatus: 501 });
}

module.exports = {
  buildPaymentProviderConfig,
  validatePaymentProviderConfig,
  createPaymentTransaction,
};
