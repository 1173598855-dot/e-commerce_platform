const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createRedisRateLimitStore,
  createRateLimiter,
} = require('./rate-limit');

test('createRedisRateLimitStore increments a shared Redis key with expiration', async () => {
  const calls = [];
  const redisClient = {
    async incr(key) {
      calls.push(['incr', key]);
      return 1;
    },
    async pExpire(key, ttl) {
      calls.push(['pExpire', key, ttl]);
    },
    async pTTL(key) {
      calls.push(['pTTL', key]);
      return 59000;
    },
  };

  const store = createRedisRateLimitStore(redisClient, { windowMs: 60000, keyPrefix: 'gateway-rate' });
  const result = await store.increment('127.0.0.1');

  assert.deepEqual(result, { count: 1, resetMs: 59000 });
  assert.deepEqual(calls, [
    ['incr', 'gateway-rate:127.0.0.1'],
    ['pExpire', 'gateway-rate:127.0.0.1', 60000],
    ['pTTL', 'gateway-rate:127.0.0.1'],
  ]);
});

test('createRateLimiter blocks requests after the configured shared limit', async () => {
  let count = 0;
  const store = {
    async increment() {
      count += 1;
      return { count, resetMs: 60000 };
    },
  };
  const responses = [];
  const limiter = createRateLimiter({
    store,
    limit: 2,
    windowMs: 60000,
    respondError: (res, httpStatus, code, message) => {
      responses.push({ httpStatus, code, message });
      res.blocked = true;
    },
  });

  async function runRequest() {
    const req = { ip: '127.0.0.1', connection: {} };
    const res = {
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
    };
    let nextCalled = false;
    await limiter(req, res, () => { nextCalled = true; });
    return { res, nextCalled };
  }

  assert.equal((await runRequest()).nextCalled, true);
  assert.equal((await runRequest()).nextCalled, true);
  const blocked = await runRequest();

  assert.equal(blocked.nextCalled, false);
  assert.equal(blocked.res.headers['X-RateLimit-Remaining'], 0);
  assert.deepEqual(responses, [{ httpStatus: 429, code: 50003, message: '请求过于频繁，请稍后再试' }]);
});
