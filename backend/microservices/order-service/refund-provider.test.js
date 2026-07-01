const test = require('node:test');
const assert = require('node:assert/strict');

const { createRefundTransaction } = require('./refund-provider');

function withEnv(values, fn) {
  const keys = [
    'PAYMENT_PROVIDER',
    'PAYMENT_CALLBACK_BASE_URL',
    'WECHAT_PAY_MCH_ID',
    'WECHAT_PAY_APP_ID',
    'WECHAT_PAY_API_V3_KEY',
    'WECHAT_PAY_CERT_SERIAL_NO',
    'ALIPAY_APP_ID',
    'ALIPAY_PRIVATE_KEY',
    'ALIPAY_PUBLIC_KEY',
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      if (values[key] === undefined) delete process.env[key];
      else process.env[key] = values[key];
    }
  }
  try { return fn(); } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('createRefundTransaction returns mock refund in mock mode', async () => {
  await withEnv({ PAYMENT_PROVIDER: 'mock' }, async () => {
    const result = await createRefundTransaction({
      refundId: 42,
      orderNo: 'ORD42',
      amount: '88.00',
      provider: 'mock',
    });

    assert.equal(result.provider, 'mock');
    assert.equal(result.refundId, 42);
    assert.match(result.providerRefundId, /^MOCK-REFUND-/);
  });
});

test('createRefundTransaction validates real provider config before SDK submission', async () => {
  await withEnv({ PAYMENT_PROVIDER: 'wechat' }, async () => {
    await assert.rejects(
      () => createRefundTransaction({ refundId: 42, orderNo: 'ORD42', amount: '88.00', provider: 'wechat' }),
      /Payment provider wechat missing configuration:/
    );
  });
});

test('createRefundTransaction fails clearly for configured real provider refund SDKs', async () => {
  await withEnv({
    PAYMENT_PROVIDER: 'alipay',
    PAYMENT_CALLBACK_BASE_URL: 'https://api.example.com',
    ALIPAY_APP_ID: 'app',
    ALIPAY_PRIVATE_KEY: 'private',
    ALIPAY_PUBLIC_KEY: 'public',
  }, async () => {
    await assert.rejects(
      () => createRefundTransaction({ refundId: 42, orderNo: 'ORD42', amount: '88.00', provider: 'alipay' }),
      /Refund provider alipay SDK integration is not implemented yet/
    );
  });
});
