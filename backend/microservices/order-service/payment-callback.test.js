const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCallbackIdempotencyKey,
  normalizePaymentCallbackProvider,
  verifyPaymentCallback,
} = require('./payment-callback');

test('normalizePaymentCallbackProvider accepts common WeChat aliases', () => {
  assert.equal(normalizePaymentCallbackProvider('wechatpay'), 'wechat');
  assert.equal(normalizePaymentCallbackProvider('WeChat'), 'wechat');
});

test('buildCallbackIdempotencyKey uses provider and transaction identifiers', () => {
  assert.equal(
    buildCallbackIdempotencyKey({ provider: 'wechat', transactionId: 'TX123', orderNo: 'ORD9' }),
    'payment-callback:wechat:TX123'
  );
});

test('buildCallbackIdempotencyKey falls back to order number when transaction id is missing', () => {
  assert.equal(
    buildCallbackIdempotencyKey({ provider: 'alipay', orderNo: 'ORD9' }),
    'payment-callback:alipay:ORD9'
  );
});

test('verifyPaymentCallback rejects unsupported providers', async () => {
  await assert.rejects(
    () => verifyPaymentCallback({ provider: 'paypal', payload: { orderNo: 'ORD9' }, headers: {} }),
    /Unsupported payment callback provider: paypal/
  );
});

test('verifyPaymentCallback validates configured real provider before SDK verification', async () => {
  await assert.rejects(
    () => verifyPaymentCallback({ provider: 'wechat', payload: { orderNo: 'ORD9' }, headers: {} }),
    /Payment provider wechat missing configuration:/
  );
});

test('verifyPaymentCallback returns mock callback details for local callback checks', async () => {
  const result = await verifyPaymentCallback({
    provider: 'mock',
    payload: { orderNo: 'ORD9', transactionId: 'TX123', paidAmount: '99.90' },
    headers: {},
  });

  assert.deepEqual(result, {
    provider: 'mock',
    orderNo: 'ORD9',
    transactionId: 'TX123',
    paidAmount: '99.90',
    idempotencyKey: 'payment-callback:mock:TX123',
  });
});
