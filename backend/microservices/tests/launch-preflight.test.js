const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  parseEnvContent,
  validateMinimumLaunchConfig,
  maskKeyName,
} = require('../scripts/launch-preflight');

test('parseEnvContent reads simple dotenv values without exposing comments', () => {
  const env = parseEnvContent(`
# ignored
NODE_ENV=production
JWT_SECRET="abcdefghijklmnopqrstuvwxyz"
PAYMENT_PROVIDER=wechat
`);

  assert.equal(env.NODE_ENV, 'production');
  assert.equal(env.JWT_SECRET, 'abcdefghijklmnopqrstuvwxyz');
  assert.equal(env.PAYMENT_PROVIDER, 'wechat');
  assert.equal(Object.prototype.hasOwnProperty.call(env, '# ignored'), false);
});

test('validateMinimumLaunchConfig accepts minimum gray launch settings', () => {
  const env = {
    NODE_ENV: 'production',
    JWT_SECRET: 'x'.repeat(64),
    DB_PASSWORD: 'strong-db-password',
    REDIS_PASSWORD: 'strong-redis-password',
    PERMISSION_TOKEN_VERSION_ENFORCEMENT: '1',
    PAYMENT_PROVIDER: 'wechat',
    PAYMENT_CALLBACK_BASE_URL: 'https://api.example.com/orders',
    WECHAT_PAY_MCH_ID: 'mch-id',
    WECHAT_PAY_APP_ID: 'wx-app',
    WECHAT_PAY_API_V3_KEY: 'v3-key',
    WECHAT_PAY_CERT_SERIAL_NO: 'cert-serial',
    REFUND_EVIDENCE_STORAGE_PROVIDER: 'oss',
    REFUND_EVIDENCE_STORAGE_BUCKET: 'bucket',
    REFUND_EVIDENCE_STORAGE_REGION: 'cn-hangzhou',
    REFUND_EVIDENCE_STORAGE_ACCESS_KEY: 'access-key',
    REFUND_EVIDENCE_STORAGE_SECRET_KEY: 'secret-key',
    REFUND_EVIDENCE_PUBLIC_BASE_URL: 'https://cdn.example.com',
    REFUND_EVIDENCE_SCANNER_SECRET: 'scanner-secret',
    LOGISTICS_PROVIDER: 'kuaidi100',
    LOGISTICS_CALLBACK_BASE_URL: 'https://api.example.com/orders',
    KUAIDI100_KEY: 'kuaidi-key',
    KUAIDI100_CUSTOMER: 'kuaidi-customer',
    SMS_PROVIDER: 'aliyun',
    SMS_SIGN_NAME: 'shop',
    SMS_TEMPLATE_CODE: 'SMS_123',
    SMS_ACCESS_KEY_ID: 'sms-key',
    SMS_ACCESS_KEY_SECRET: 'sms-secret',
  };

  assert.deepEqual(validateMinimumLaunchConfig(env), []);
});

test('validateMinimumLaunchConfig reports mock providers and placeholders without secret values', () => {
  const issues = validateMinimumLaunchConfig({
    NODE_ENV: 'development',
    JWT_SECRET: 'short',
    DB_PASSWORD: 'change-me-to-a-strong-random-password',
    PAYMENT_PROVIDER: 'mock',
    REFUND_EVIDENCE_STORAGE_PROVIDER: 'mock',
    LOGISTICS_PROVIDER: 'mock',
    SMS_PROVIDER: 'console',
  });

  assert.ok(issues.includes('NODE_ENV must be production'));
  assert.ok(issues.includes('JWT_SECRET must be at least 64 characters'));
  assert.ok(issues.includes('DB_PASSWORD must not use the example placeholder'));
  assert.ok(issues.includes('PAYMENT_PROVIDER must be wechat for minimum gray launch'));
  assert.ok(issues.includes('REFUND_EVIDENCE_STORAGE_PROVIDER must be oss, cos, or s3'));
  assert.ok(issues.includes('LOGISTICS_PROVIDER must be kuaidi100'));
  assert.ok(issues.includes('SMS_PROVIDER must be aliyun or tencent'));
  assert.equal(issues.some((issue) => issue.includes('change-me-to-a-strong-random-password')), false);
});

test('maskKeyName keeps diagnostics about field names only', () => {
  assert.equal(maskKeyName('WECHAT_PAY_API_V3_KEY'), 'WECHAT_PAY_API_V3_KEY');
});

test('launch preflight cli exits nonzero for missing env file', () => {
  const result = spawnSync(process.execPath, [
    path.resolve(__dirname, '..', 'scripts', 'launch-preflight.js'),
    path.resolve(__dirname, 'missing.env'),
  ], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /not found/);
});
