function buildRedisClientOptions() {
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

module.exports = { buildRedisClientOptions };
