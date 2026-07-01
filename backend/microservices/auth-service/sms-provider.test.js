const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSmsProviderConfig,
  validateSmsProviderConfig,
  sendSmsCode,
} = require('./sms-provider');

function withEnv(values, fn) {
  const keys = [
    'SMS_PROVIDER',
    'SMS_SIGN_NAME',
    'SMS_TEMPLATE_CODE',
    'SMS_ACCESS_KEY_ID',
    'SMS_ACCESS_KEY_SECRET',
    'SMS_ENDPOINT',
    'SMS_APP_ID',
    'SMS_CONSOLE_LOG_CODE',
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

test('buildSmsProviderConfig defaults to console provider', () => {
  withEnv({ SMS_PROVIDER: undefined }, () => {
    assert.equal(buildSmsProviderConfig().provider, 'console');
  });
});

test('validateSmsProviderConfig requires production provider credentials', () => {
  const missing = validateSmsProviderConfig({ provider: 'aliyun' });

  assert.deepEqual(missing, ['SMS_SIGN_NAME', 'SMS_TEMPLATE_CODE', 'SMS_ACCESS_KEY_ID', 'SMS_ACCESS_KEY_SECRET']);
});

test('sendSmsCode redacts console verification code unless explicitly enabled', async () => {
  const logs = [];

  await withEnv({ SMS_PROVIDER: 'console', SMS_CONSOLE_LOG_CODE: undefined }, async () => {
    const result = await sendSmsCode({ phone: '13800138000', code: '123456', logger: (message) => logs.push(message) });

    assert.deepEqual(result, { provider: 'console', delivered: true });
    assert.equal(logs[0].includes('123456'), false);
    assert.equal(logs[0].includes('13800138000'), false);
  });
});

test('sendSmsCode fails clearly for configured providers until SDK integration is added', async () => {
  await withEnv({
    SMS_PROVIDER: 'aliyun',
    SMS_SIGN_NAME: 'Xiaoyi',
    SMS_TEMPLATE_CODE: 'SMS_123',
    SMS_ACCESS_KEY_ID: 'ak',
    SMS_ACCESS_KEY_SECRET: 'sk',
  }, async () => {
    await assert.rejects(
      () => sendSmsCode({ phone: '13800138000', code: '123456' }),
      /SMS provider aliyun SDK integration is not implemented yet/
    );
  });
});
