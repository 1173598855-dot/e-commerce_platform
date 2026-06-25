const { createClient } = require('redis');

let redisClient;

async function initRedis() {
  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      console.warn('Redis 错误:', err.message);
    });
    redisClient.on('connect', () => console.log('Redis 已连接'));

    await redisClient.connect();
    console.log('Redis 连接成功');
    return redisClient;
  } catch (err) {
    console.warn('Redis 初始化失败:', err.message);
    redisClient = null;
    return null;
  }
}

function getRedisClient() {
  return redisClient;
}

module.exports = { initRedis, getRedisClient };
