const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildRefundCallbackIdempotencyKey,
  normalizeRefundCallbackProvider,
  verifyRefundCallback,
} = require('./refund-callback');

test('normalizeRefundCallbackProvider accepts common WeChat aliases', () => {
  assert.equal(normalizeRefundCallbackProvider('wxpay'), 'wechat');
  assert.equal(normalizeRefundCallbackProvider('wechatpay'), 'wechat');
});

test('buildRefundCallbackIdempotencyKey uses provider refund id before refund id', () => {
  assert.equal(
    buildRefundCallbackIdempotencyKey({ provider: 'alipay', providerRefundId: 'RF123', refundId: 42 }),
    'refund-callback:alipay:RF123'
  );
});

test('verifyRefundCallback returns mock success callback details', async () => {
  const result = await verifyRefundCallback({
    provider: 'mock',
    payload: {
      refundId: 42,
      providerRefundId: 'MOCK-REFUND-42',
      status: 'success',
      failedReason: '',
    },
  });

  assert.deepEqual(result, {
    provider: 'mock',
    refundId: 42,
    providerRefundId: 'MOCK-REFUND-42',
    status: 'refunded',
    failedReason: '',
    idempotencyKey: 'refund-callback:mock:MOCK-REFUND-42',
  });
});

test('verifyRefundCallback maps mock failure callback details', async () => {
  const result = await verifyRefundCallback({
    provider: 'mock',
    payload: {
      refund_id: 42,
      out_refund_no: 'MOCK-REFUND-42',
      refund_status: 'failed',
      failed_reason: 'provider rejected',
    },
  });

  assert.deepEqual(result, {
    provider: 'mock',
    refundId: 42,
    providerRefundId: 'MOCK-REFUND-42',
    status: 'failed',
    failedReason: 'provider rejected',
    idempotencyKey: 'refund-callback:mock:MOCK-REFUND-42',
  });
});

test('verifyRefundCallback validates configured real provider before SDK verification', async () => {
  const previousProvider = process.env.REFUND_PROVIDER;
  const previousAppId = process.env.WECHAT_PAY_APP_ID;
  delete process.env.WECHAT_PAY_APP_ID;
  process.env.REFUND_PROVIDER = 'wechat';

  try {
    await assert.rejects(
      () => verifyRefundCallback({ provider: 'wechat', payload: { refundId: 42, providerRefundId: 'RF123', status: 'success' } }),
      /Refund provider wechat missing configuration:/
    );
  } finally {
    if (previousProvider === undefined) delete process.env.REFUND_PROVIDER;
    else process.env.REFUND_PROVIDER = previousProvider;
    if (previousAppId === undefined) delete process.env.WECHAT_PAY_APP_ID;
    else process.env.WECHAT_PAY_APP_ID = previousAppId;
  }
});
