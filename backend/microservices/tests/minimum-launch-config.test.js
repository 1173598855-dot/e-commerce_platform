const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const envExample = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', '.env.example'), 'utf8');

test('env example documents minimum launch provider and token enforcement settings', () => {
  for (const key of [
    'PERMISSION_TOKEN_VERSION_ENFORCEMENT',
    'PAYMENT_PROVIDER',
    'PAYMENT_CALLBACK_BASE_URL',
    'WECHAT_PAY_MCH_ID',
    'WECHAT_PAY_APP_ID',
    'WECHAT_PAY_API_V3_KEY',
    'WECHAT_PAY_CERT_SERIAL_NO',
    'REFUND_EVIDENCE_STORAGE_PROVIDER',
    'REFUND_EVIDENCE_STORAGE_BUCKET',
    'REFUND_EVIDENCE_STORAGE_ACCESS_KEY',
    'REFUND_EVIDENCE_STORAGE_SECRET_KEY',
    'RETENTION_CLEANUP_WORKER_ENABLED',
    'RETENTION_CLEANUP_DRY_RUN',
    'RETENTION_CLEANUP_BATCH_SIZE',
    'RETENTION_CLEANUP_WORKER_INTERVAL_MS',
    'LOGISTICS_PROVIDER',
    'LOGISTICS_CALLBACK_BASE_URL',
    'KUAIDI100_KEY',
    'KUAIDI100_CUSTOMER',
  ]) {
    assert.match(envExample, new RegExp(`^${key}=`, 'm'), `${key} should be documented in .env.example`);
  }
});
