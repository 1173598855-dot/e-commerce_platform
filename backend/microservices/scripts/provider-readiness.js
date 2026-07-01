const fs = require('node:fs');
const path = require('node:path');

const { parseEnvContent } = require('./launch-preflight');
const { validatePaymentProviderConfig } = require('../order-service/payment-provider');
const { validateRefundProviderConfig } = require('../order-service/refund-provider');
const { buildRefundEvidenceUploadConfig } = require('../order-service/refund-evidence-upload');
const { buildLogisticsProviderConfig, validateLogisticsProviderConfig } = require('../order-service/logistics-provider');
const { validateSmsProviderConfig } = require('../auth-service/sms-provider');

function envValue(env, key, fallback = '') {
  return Object.prototype.hasOwnProperty.call(env, key) ? env[key] : fallback;
}

function paymentConfigFromEnv(env) {
  return {
    provider: String(envValue(env, 'PAYMENT_PROVIDER', 'mock')).toLowerCase(),
    callbackBaseUrl: envValue(env, 'PAYMENT_CALLBACK_BASE_URL'),
    wechat: {
      mchId: envValue(env, 'WECHAT_PAY_MCH_ID'),
      appId: envValue(env, 'WECHAT_PAY_APP_ID'),
      apiV3Key: envValue(env, 'WECHAT_PAY_API_V3_KEY'),
      certSerialNo: envValue(env, 'WECHAT_PAY_CERT_SERIAL_NO'),
    },
    alipay: {
      appId: envValue(env, 'ALIPAY_APP_ID'),
      privateKey: envValue(env, 'ALIPAY_PRIVATE_KEY'),
      publicKey: envValue(env, 'ALIPAY_PUBLIC_KEY'),
    },
  };
}

function smsConfigFromEnv(env) {
  return {
    provider: String(envValue(env, 'SMS_PROVIDER', 'console')).toLowerCase(),
    signName: envValue(env, 'SMS_SIGN_NAME'),
    templateCode: envValue(env, 'SMS_TEMPLATE_CODE'),
    accessKeyId: envValue(env, 'SMS_ACCESS_KEY_ID'),
    accessKeySecret: envValue(env, 'SMS_ACCESS_KEY_SECRET'),
    appId: envValue(env, 'SMS_APP_ID'),
  };
}

function missingStatus(provider, missing) {
  if (provider === 'mock' || provider === 'console') return 'mock';
  return missing.length > 0 ? 'missing_config' : 'not_implemented';
}

function providerReadiness(provider, missing) {
  return { provider, status: missingStatus(provider, missing), missing };
}

function getEvidenceStorageReadiness(env) {
  const provider = String(envValue(env, 'REFUND_EVIDENCE_STORAGE_PROVIDER', 'mock')).toLowerCase();
  if (provider === 'mock') return { provider, status: 'mock', missing: [] };
  const required = [
    'REFUND_EVIDENCE_STORAGE_BUCKET',
    'REFUND_EVIDENCE_STORAGE_REGION',
    'REFUND_EVIDENCE_STORAGE_ACCESS_KEY',
    'REFUND_EVIDENCE_STORAGE_SECRET_KEY',
  ];
  const missing = required.filter((key) => !envValue(env, key));
  if (missing.length > 0) return { provider, status: 'missing_config', missing };

  try {
    buildRefundEvidenceUploadConfig({
      provider,
      bucket: envValue(env, 'REFUND_EVIDENCE_STORAGE_BUCKET'),
      region: envValue(env, 'REFUND_EVIDENCE_STORAGE_REGION'),
      endpoint: envValue(env, 'REFUND_EVIDENCE_STORAGE_ENDPOINT'),
      accessKey: envValue(env, 'REFUND_EVIDENCE_STORAGE_ACCESS_KEY'),
      secretKey: envValue(env, 'REFUND_EVIDENCE_STORAGE_SECRET_KEY'),
      publicBaseUrl: envValue(env, 'REFUND_EVIDENCE_PUBLIC_BASE_URL'),
    });
    return { provider, status: 'not_implemented', missing: [] };
  } catch (err) {
    const missingKey = String(err.message || '').match(/^[A-Z0-9_]+/)?.[0];
    return { provider, status: 'missing_config', missing: missingKey ? [missingKey] : ['REFUND_EVIDENCE_STORAGE_CONFIG'] };
  }
}

function getProviderReadiness(env = process.env) {
  const paymentConfig = paymentConfigFromEnv(env);
  const paymentMissing = validatePaymentProviderConfig(paymentConfig);
  const refundMissing = validateRefundProviderConfig(paymentConfig);
  const logisticsConfig = buildLogisticsProviderConfig(env);
  const logisticsMissing = validateLogisticsProviderConfig(logisticsConfig);
  const smsConfig = smsConfigFromEnv(env);
  const smsMissing = validateSmsProviderConfig(smsConfig);
  const permissionTokenEnabled = envValue(env, 'PERMISSION_TOKEN_VERSION_ENFORCEMENT') === '1';

  return {
    payment: providerReadiness(paymentConfig.provider, paymentMissing),
    refund: providerReadiness(paymentConfig.provider, refundMissing),
    evidenceStorage: getEvidenceStorageReadiness(env),
    logistics: providerReadiness(logisticsConfig.provider, logisticsMissing),
    sms: providerReadiness(smsConfig.provider, smsMissing),
    permissionToken: {
      provider: 'permission_versions',
      status: permissionTokenEnabled ? 'ready' : 'disabled',
      missing: permissionTokenEnabled ? [] : ['PERMISSION_TOKEN_VERSION_ENFORCEMENT'],
    },
  };
}

function summarizeProviderReadiness(readiness) {
  const blockers = Object.entries(readiness)
    .filter(([, item]) => item.status !== 'ready')
    .map(([name, item]) => `${name} is ${item.status}`);
  return { ready: blockers.length === 0, blockers };
}

function runCli(argv = process.argv) {
  const envPath = argv[2] || path.resolve(process.cwd(), '.env.production.local');
  if (!fs.existsSync(envPath)) {
    console.error(`Provider readiness env file not found: ${envPath}`);
    return 1;
  }

  const env = parseEnvContent(fs.readFileSync(envPath, 'utf8'));
  const providers = getProviderReadiness(env);
  const summary = summarizeProviderReadiness(providers);
  console.log(JSON.stringify({ summary, providers }, null, 2));
  return summary.ready ? 0 : 1;
}

if (require.main === module) {
  process.exit(runCli(process.argv));
}

module.exports = {
  getProviderReadiness,
  summarizeProviderReadiness,
  runCli,
};
