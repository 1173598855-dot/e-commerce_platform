const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  getProviderReadiness,
  summarizeProviderReadiness,
} = require('../scripts/provider-readiness');

const minimumEnv = {
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

test('getProviderReadiness reports mock providers as not ready for launch', () => {
  const readiness = getProviderReadiness({});

  assert.equal(readiness.payment.status, 'mock');
  assert.equal(readiness.refund.status, 'mock');
  assert.equal(readiness.evidenceStorage.status, 'mock');
  assert.equal(readiness.logistics.status, 'mock');
  assert.equal(readiness.sms.status, 'mock');
  assert.equal(readiness.permissionToken.status, 'disabled');
});

test('getProviderReadiness reports configured providers as not implemented until SDK work lands', () => {
  const readiness = getProviderReadiness(minimumEnv);

  assert.deepEqual(readiness.payment, { provider: 'wechat', status: 'not_implemented', missing: [] });
  assert.deepEqual(readiness.refund, { provider: 'wechat', status: 'not_implemented', missing: [] });
  assert.deepEqual(readiness.evidenceStorage, { provider: 'oss', status: 'not_implemented', missing: [] });
  assert.deepEqual(readiness.logistics, { provider: 'kuaidi100', status: 'not_implemented', missing: [] });
  assert.deepEqual(readiness.sms, { provider: 'aliyun', status: 'not_implemented', missing: [] });
  assert.deepEqual(readiness.permissionToken, { provider: 'permission_versions', status: 'ready', missing: [] });
});

test('getProviderReadiness reports missing field names without secret values', () => {
  const readiness = getProviderReadiness({ PAYMENT_PROVIDER: 'wechat', REFUND_EVIDENCE_STORAGE_PROVIDER: 'oss' });

  assert.equal(readiness.payment.status, 'missing_config');
  assert.ok(readiness.payment.missing.includes('WECHAT_PAY_API_V3_KEY'));
  assert.equal(readiness.evidenceStorage.status, 'missing_config');
  assert.ok(readiness.evidenceStorage.missing.includes('REFUND_EVIDENCE_STORAGE_SECRET_KEY'));
  assert.equal(JSON.stringify(readiness).includes('v3-key'), false);
});

test('summarizeProviderReadiness marks launch unready while SDKs are not implemented', () => {
  const summary = summarizeProviderReadiness(getProviderReadiness(minimumEnv));

  assert.equal(summary.ready, false);
  assert.deepEqual(summary.blockers, [
    'payment is not_implemented',
    'refund is not_implemented',
    'evidenceStorage is not_implemented',
    'logistics is not_implemented',
    'sms is not_implemented',
  ]);
});

test('provider readiness cli prints JSON without secrets', () => {
  const result = spawnSync(process.execPath, [
    path.resolve(__dirname, '..', 'scripts', 'provider-readiness.js'),
    path.resolve(__dirname, '..', '..', '..', '.env.example'),
  ], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  const output = JSON.parse(result.stdout);
  assert.equal(output.summary.ready, false);
  assert.equal(JSON.stringify(output).includes('change-me-to-a-strong-random-password'), false);
});
