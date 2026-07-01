const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'jwt',
  'secret',
  'accessKeySecret',
  'SMS_ACCESS_KEY_SECRET',
]);

function maskPhone(value) {
  const text = String(value || '');
  if (/^\d{11}$/.test(text)) {
    return text.slice(0, 3) + '****' + text.slice(-4);
  }
  return text;
}

function redactLogData(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactLogData(item));
  }

  if (!value || typeof value !== 'object') {
    return maskPhone(value);
  }

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key) || /secret|password|token|authorization/i.test(key)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redactLogData(child);
    }
  }
  return result;
}

function createLogger({ service, sink } = {}) {
  const target = sink || ((line) => console.log(line));
  const serviceName = service || process.env.SERVICE_NAME || 'app';

  function write(level, message, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      service: serviceName,
      level,
      message,
      ...redactLogData(data || {}),
    };
    target(JSON.stringify(entry));
  }

  return {
    debug(message, data) { write('debug', message, data); },
    info(message, data) { write('info', message, data); },
    warn(message, data) { write('warn', message, data); },
    error(message, data) { write('error', message, data); },
  };
}

module.exports = { createLogger, redactLogData };
