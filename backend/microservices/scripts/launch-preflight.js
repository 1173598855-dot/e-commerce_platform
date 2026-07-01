const fs = require('node:fs');
const path = require('node:path');

const PLACEHOLDER_PATTERN = /^(change-me|your_|example|todo|tbd)/i;

function stripQuotes(value) {
  const trimmed = String(value || '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnvContent(content) {
  return String(content || '').split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return env;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) return env;
    const key = trimmed.slice(0, separator).trim();
    const value = stripQuotes(trimmed.slice(separator + 1));
    env[key] = value;
    return env;
  }, {});
}

function isBlank(value) {
  return String(value || '').trim() === '';
}

function isPlaceholder(value) {
  const normalized = String(value || '').trim();
  return PLACEHOLDER_PATTERN.test(normalized) || normalized.includes('change-me');
}

function requireValue(env, key, issues) {
  if (isBlank(env[key])) {
    issues.push(`${key} is required`);
    return;
  }
  if (isPlaceholder(env[key])) {
    issues.push(`${key} must not use the example placeholder`);
  }
}

function requireOneOf(env, key, allowed, issues) {
  const value = String(env[key] || '').trim().toLowerCase();
  if (!allowed.includes(value)) {
    issues.push(`${key} must be ${allowed.join(' or ')}`);
  }
}

function validateMinimumLaunchConfig(env) {
  const issues = [];

  if (env.NODE_ENV !== 'production') issues.push('NODE_ENV must be production');
  if (String(env.JWT_SECRET || '').length < 64) issues.push('JWT_SECRET must be at least 64 characters');

  for (const key of ['DB_PASSWORD', 'REDIS_PASSWORD']) requireValue(env, key, issues);

  requireOneOf(env, 'PERMISSION_TOKEN_VERSION_ENFORCEMENT', ['1'], issues);

  if (String(env.PAYMENT_PROVIDER || '').trim().toLowerCase() !== 'wechat') {
    issues.push('PAYMENT_PROVIDER must be wechat for minimum gray launch');
  }
  for (const key of ['PAYMENT_CALLBACK_BASE_URL', 'WECHAT_PAY_MCH_ID', 'WECHAT_PAY_APP_ID', 'WECHAT_PAY_API_V3_KEY', 'WECHAT_PAY_CERT_SERIAL_NO']) {
    requireValue(env, key, issues);
  }

  if (!['oss', 'cos', 's3'].includes(String(env.REFUND_EVIDENCE_STORAGE_PROVIDER || '').trim().toLowerCase())) {
    issues.push('REFUND_EVIDENCE_STORAGE_PROVIDER must be oss, cos, or s3');
  }
  for (const key of [
    'REFUND_EVIDENCE_STORAGE_BUCKET',
    'REFUND_EVIDENCE_STORAGE_REGION',
    'REFUND_EVIDENCE_STORAGE_ACCESS_KEY',
    'REFUND_EVIDENCE_STORAGE_SECRET_KEY',
    'REFUND_EVIDENCE_PUBLIC_BASE_URL',
    'REFUND_EVIDENCE_SCANNER_SECRET',
  ]) {
    requireValue(env, key, issues);
  }

  requireOneOf(env, 'LOGISTICS_PROVIDER', ['kuaidi100'], issues);
  for (const key of ['LOGISTICS_CALLBACK_BASE_URL', 'KUAIDI100_KEY', 'KUAIDI100_CUSTOMER']) requireValue(env, key, issues);

  requireOneOf(env, 'SMS_PROVIDER', ['aliyun', 'tencent'], issues);
  for (const key of ['SMS_SIGN_NAME', 'SMS_TEMPLATE_CODE', 'SMS_ACCESS_KEY_ID', 'SMS_ACCESS_KEY_SECRET']) requireValue(env, key, issues);

  return issues;
}

function maskKeyName(key) {
  return String(key || '').trim();
}

function runCli(argv = process.argv) {
  const envPath = argv[2] || path.resolve(process.cwd(), '.env.production.local');
  if (!fs.existsSync(envPath)) {
    console.error(`Launch preflight env file not found: ${envPath}`);
    return 1;
  }

  const env = parseEnvContent(fs.readFileSync(envPath, 'utf8'));
  const issues = validateMinimumLaunchConfig(env);
  if (issues.length > 0) {
    console.error('Minimum launch preflight failed:');
    for (const issue of issues) console.error(`- ${issue}`);
    return 1;
  }

  console.log('Minimum launch preflight passed.');
  return 0;
}

if (require.main === module) {
  process.exit(runCli(process.argv));
}

module.exports = {
  parseEnvContent,
  validateMinimumLaunchConfig,
  maskKeyName,
  runCli,
};
