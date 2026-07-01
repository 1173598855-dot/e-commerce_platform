const test = require('node:test');
const assert = require('node:assert/strict');

const { buildRedisClientOptions } = require('./redis-config');

function withEnv(values, fn) {
  const previous = {
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  };

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    fn();
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

test('buildRedisClientOptions includes password when REDIS_PASSWORD is configured', () => {
  withEnv({ REDIS_HOST: 'redis', REDIS_PORT: '6380', REDIS_PASSWORD: 'secret-value' }, () => {
    assert.deepEqual(buildRedisClientOptions(), {
      socket: { host: 'redis', port: 6380 },
      password: 'secret-value',
    });
  });
});

test('buildRedisClientOptions keeps password unset for unauthenticated local Redis', () => {
  withEnv({ REDIS_HOST: undefined, REDIS_PORT: undefined, REDIS_PASSWORD: '' }, () => {
    assert.deepEqual(buildRedisClientOptions(), {
      socket: { host: 'localhost', port: 6379 },
    });
  });
});
