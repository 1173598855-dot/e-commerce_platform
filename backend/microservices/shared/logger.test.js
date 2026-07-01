const test = require('node:test');
const assert = require('node:assert/strict');

const { createLogger, redactLogData } = require('./logger');

test('redactLogData masks sensitive fields recursively', () => {
  assert.deepEqual(redactLogData({
    phone: '13800138000',
    password: 'secret',
    nested: { token: 'jwt', keep: 'ok' },
  }), {
    phone: '138****8000',
    password: '[REDACTED]',
    nested: { token: '[REDACTED]', keep: 'ok' },
  });
});

test('createLogger writes structured JSON log entries', () => {
  const entries = [];
  const logger = createLogger({
    service: 'gateway',
    sink: (line) => entries.push(JSON.parse(line)),
  });

  logger.info('request completed', {
    requestId: 'req-1',
    method: 'GET',
    password: 'secret',
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].service, 'gateway');
  assert.equal(entries[0].level, 'info');
  assert.equal(entries[0].message, 'request completed');
  assert.equal(entries[0].requestId, 'req-1');
  assert.equal(entries[0].method, 'GET');
  assert.equal(entries[0].password, '[REDACTED]');
  assert.match(entries[0].timestamp, /^\d{4}-\d{2}-\d{2}T/);
});
