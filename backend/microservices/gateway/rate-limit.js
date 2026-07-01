function getClientId(req) {
  const forwardedFor = req.headers && req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return String(forwardedFor).split(',')[0].trim();
  }
  return req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
}

function buildGatewayRedisClientOptions() {
  const options = {
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    },
  };

  if (process.env.REDIS_PASSWORD) {
    options.password = process.env.REDIS_PASSWORD;
  }

  return options;
}

function createMemoryRateLimitStore({ windowMs } = {}) {
  const store = new Map();
  const ttl = windowMs || 60 * 1000;

  return {
    async increment(clientId) {
      const now = Date.now();
      const timestamps = (store.get(clientId) || []).filter((time) => time > now - ttl);
      timestamps.push(now);
      store.set(clientId, timestamps);
      return { count: timestamps.length, resetMs: ttl };
    },
    cleanup() {
      const now = Date.now();
      for (const [clientId, timestamps] of store) {
        const valid = timestamps.filter((time) => time > now - ttl);
        if (valid.length === 0) {
          store.delete(clientId);
        } else {
          store.set(clientId, valid);
        }
      }
    },
  };
}

function createRedisRateLimitStore(redisClient, { windowMs, keyPrefix } = {}) {
  const ttl = windowMs || 60 * 1000;
  const prefix = keyPrefix || 'gateway-rate-limit';

  return {
    async increment(clientId) {
      const key = `${prefix}:${clientId}`;
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.pExpire(key, ttl);
      }
      const resetMs = await redisClient.pTTL(key);
      return { count, resetMs: resetMs > 0 ? resetMs : ttl };
    },
  };
}

function createRateLimiter({ store, limit, windowMs, respondError, logger }) {
  const max = limit || 100;
  const ttl = windowMs || 60 * 1000;

  return async function rateLimiter(req, res, next) {
    try {
      const clientId = getClientId(req);
      const result = await store.increment(clientId);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - result.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil((result.resetMs || ttl) / 1000));

      if (result.count > max) {
        return respondError(res, 429, 50003, '请求过于频繁，请稍后再试');
      }
      return next();
    } catch (err) {
      if (logger && logger.warn) {
        logger.warn('rate limiter unavailable', { error: err.message });
      } else {
        console.warn('Rate limiter unavailable:', err.message);
      }
      return next();
    }
  };
}

module.exports = {
  buildGatewayRedisClientOptions,
  createMemoryRateLimitStore,
  createRedisRateLimitStore,
  createRateLimiter,
  getClientId,
};
