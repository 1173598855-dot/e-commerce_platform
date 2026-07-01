const { buildPaymentProviderConfig, validatePaymentProviderConfig } = require('./payment-provider');

function buildRefundProviderConfig() {
  return buildPaymentProviderConfig();
}

function validateRefundProviderConfig(config) {
  return validatePaymentProviderConfig(config);
}

async function createRefundTransaction({ refundId, orderNo, amount, provider }) {
  const config = buildRefundProviderConfig();
  const normalizedProvider = String(provider || config.provider || 'mock').toLowerCase() === 'wechatpay'
    ? 'wechat'
    : String(provider || config.provider || 'mock').toLowerCase();

  if (normalizedProvider === 'mock') {
    return {
      provider: 'mock',
      refundId,
      orderNo,
      amount,
      providerRefundId: 'MOCK-REFUND-' + Date.now(),
    };
  }

  if (!['wechat', 'alipay'].includes(normalizedProvider)) {
    throw Object.assign(new Error(`Unsupported refund provider: ${normalizedProvider}`), { httpStatus: 400 });
  }

  const missing = validateRefundProviderConfig({ ...config, provider: normalizedProvider });
  if (missing.length > 0) {
    throw Object.assign(new Error(`Payment provider ${normalizedProvider} missing configuration: ${missing.join(', ')}`), { httpStatus: 500 });
  }

  throw Object.assign(new Error(`Refund provider ${normalizedProvider} SDK integration is not implemented yet`), { httpStatus: 501 });
}

module.exports = { buildRefundProviderConfig, createRefundTransaction, validateRefundProviderConfig };
