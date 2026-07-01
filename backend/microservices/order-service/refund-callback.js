const { buildRefundProviderConfig, validateRefundProviderConfig } = require('./refund-provider');
const { normalizeRefundStatus } = require('./refund-state-machine');

function normalizeRefundCallbackProvider(provider) {
  const normalized = String(provider || '').trim().toLowerCase();
  if (normalized === 'wechatpay' || normalized === 'wxpay') return 'wechat';
  return normalized || 'mock';
}

function buildRefundCallbackIdempotencyKey({ provider, providerRefundId, refundId }) {
  const normalizedProvider = normalizeRefundCallbackProvider(provider);
  const identifier = providerRefundId || refundId;
  if (!identifier) {
    throw Object.assign(new Error('Refund callback missing providerRefundId or refundId'), { httpStatus: 400 });
  }
  return `refund-callback:${normalizedProvider}:${identifier}`;
}

function normalizeProviderRefundStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (['success', 'succeeded', 'refunded', 'refund_success'].includes(normalized)) return 'refunded';
  if (['fail', 'failed', 'closed', 'refund_failed'].includes(normalized)) return 'failed';
  return normalizeRefundStatus(normalized);
}

async function verifyRefundCallback({ provider, payload, headers }) {
  const normalizedProvider = normalizeRefundCallbackProvider(provider);
  if (!['mock', 'wechat', 'alipay'].includes(normalizedProvider)) {
    throw Object.assign(new Error(`Unsupported refund callback provider: ${normalizedProvider}`), { httpStatus: 400 });
  }

  const refundId = payload?.refundId || payload?.refund_request_id || payload?.request_id || payload?.refund_id;
  const providerRefundId = payload?.providerRefundId || payload?.provider_refund_id || payload?.out_refund_no || payload?.refund_no || payload?.refund_id;
  const status = normalizeProviderRefundStatus(payload?.status || payload?.refund_status || payload?.trade_status);
  const failedReason = payload?.failedReason || payload?.failed_reason || payload?.reason || '';
  const idempotencyKey = buildRefundCallbackIdempotencyKey({ provider: normalizedProvider, providerRefundId, refundId });

  if (!['refunded', 'failed'].includes(status)) {
    throw Object.assign(new Error(`Unsupported refund callback status: ${status}`), { httpStatus: 400 });
  }

  if (normalizedProvider === 'mock') {
    return { provider: 'mock', refundId, providerRefundId, status, failedReason, idempotencyKey };
  }

  const config = { ...buildRefundProviderConfig(), provider: normalizedProvider };
  const missing = validateRefundProviderConfig(config);
  if (missing.length > 0) {
    throw Object.assign(new Error(`Refund provider ${normalizedProvider} missing configuration: ${missing.join(', ')}`), { httpStatus: 500 });
  }

  void headers;
  throw Object.assign(new Error(`Refund callback verification for ${normalizedProvider} is not implemented yet`), { httpStatus: 501 });
}

module.exports = {
  buildRefundCallbackIdempotencyKey,
  normalizeRefundCallbackProvider,
  verifyRefundCallback,
};
