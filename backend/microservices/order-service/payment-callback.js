const { buildPaymentProviderConfig, validatePaymentProviderConfig } = require('./payment-provider');

function normalizePaymentCallbackProvider(provider) {
  const normalized = String(provider || '').trim().toLowerCase();
  if (normalized === 'wechatpay' || normalized === 'wxpay') return 'wechat';
  return normalized || 'mock';
}

function buildCallbackIdempotencyKey({ provider, transactionId, orderNo }) {
  const normalizedProvider = normalizePaymentCallbackProvider(provider);
  const identifier = transactionId || orderNo;
  if (!identifier) {
    throw Object.assign(new Error('Payment callback missing transactionId or orderNo'), { httpStatus: 400 });
  }
  return `payment-callback:${normalizedProvider}:${identifier}`;
}

async function verifyPaymentCallback({ provider, payload, headers }) {
  const normalizedProvider = normalizePaymentCallbackProvider(provider);
  if (!['mock', 'wechat', 'alipay'].includes(normalizedProvider)) {
    throw Object.assign(new Error(`Unsupported payment callback provider: ${normalizedProvider}`), { httpStatus: 400 });
  }

  const orderNo = payload?.orderNo || payload?.order_no || payload?.out_trade_no;
  const transactionId = payload?.transactionId || payload?.transaction_id || payload?.trade_no;
  const paidAmount = payload?.paidAmount || payload?.paid_amount || payload?.amount || payload?.total_amount;
  const idempotencyKey = buildCallbackIdempotencyKey({ provider: normalizedProvider, transactionId, orderNo });

  if (normalizedProvider === 'mock') {
    return { provider: 'mock', orderNo, transactionId, paidAmount, idempotencyKey };
  }

  const config = { ...buildPaymentProviderConfig(), provider: normalizedProvider };
  const missing = validatePaymentProviderConfig(config);
  if (missing.length > 0) {
    throw Object.assign(new Error(`Payment provider ${normalizedProvider} missing configuration: ${missing.join(', ')}`), { httpStatus: 500 });
  }

  void headers;
  throw Object.assign(new Error(`Payment callback verification for ${normalizedProvider} is not implemented yet`), { httpStatus: 501 });
}

module.exports = {
  normalizePaymentCallbackProvider,
  buildCallbackIdempotencyKey,
  verifyPaymentCallback,
};
