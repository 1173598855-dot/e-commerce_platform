const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPaymentProviderConfig,
  validatePaymentProviderConfig,
  createPaymentTransaction,
} = require('./payment-provider');

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
      if (values[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = values[key];
      }
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('buildPaymentProviderConfig defaults to mock provider', () => {
  withEnv({ PAYMENT_PROVIDER: undefined }, () => {
    assert.equal(buildPaymentProviderConfig().provider, 'mock');
  });
});

test('validatePaymentProviderConfig requires WeChat Pay credentials', () => {
  const missing = validatePaymentProviderConfig({ provider: 'wechat' });

  assert.deepEqual(missing, [
    'PAYMENT_CALLBACK_BASE_URL',
    'WECHAT_PAY_MCH_ID',
    'WECHAT_PAY_APP_ID',
    'WECHAT_PAY_API_V3_KEY',
    'WECHAT_PAY_CERT_SERIAL_NO',
  ]);
});

test('createPaymentTransaction returns a mock transaction in mock mode', async () => {
  await withEnv({ PAYMENT_PROVIDER: 'mock' }, async () => {
    const result = await createPaymentTransaction({
      orderId: 7,
      orderNo: 'ORD7',
      amount: '99.90',
      paymentMethod: 'alipay',
    });

    assert.equal(result.provider, 'mock');
    assert.equal(result.paymentMethod, 'alipay');
    assert.equal(result.orderId, 7);
    assert.equal(result.amount, '99.90');
    assert.match(result.transactionId, /^MOCK-/);
  });
});

test('createPaymentTransaction fails clearly for configured real providers until SDK integration is added', async () => {
  await withEnv({
    PAYMENT_PROVIDER: 'wechat',
    PAYMENT_CALLBACK_BASE_URL: 'https://api.example.com',
    WECHAT_PAY_MCH_ID: 'mch',
    WECHAT_PAY_APP_ID: 'wx-app',
    WECHAT_PAY_API_V3_KEY: 'v3-key',
    WECHAT_PAY_CERT_SERIAL_NO: 'serial',
  }, async () => {
    await assert.rejects(
      () => createPaymentTransaction({ orderId: 7, orderNo: 'ORD7', amount: '99.90', paymentMethod: 'wechat' }),
      /Payment provider wechat SDK integration is not implemented yet/
    );
  });
});
