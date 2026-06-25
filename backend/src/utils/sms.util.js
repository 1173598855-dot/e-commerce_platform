const { getRedisClient } = require('../config/redis');

async function sendSmsCode(phone) {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis未连接，无法发送验证码');
  }

  // 生成6位随机验证码
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const key = `sms:${phone}`;
  const expire = parseInt(process.env.SMS_CODE_EXPIRE) || 300;

  await redis.set(key, code, { EX: expire });
  console.log(`[模拟短信] 验证码: ${code} -> ${phone}`);
  return code;
}

async function verifySmsCode(phone, code) {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error('Redis未连接');
  }

  const key = `sms:${phone}`;
  const storedCode = await redis.get(key);

  if (!storedCode) {
    return false;
  }

  // 验证后删除验证码（一次性使用）
  await redis.del(key);
  return storedCode === code;
}

module.exports = { sendSmsCode, verifySmsCode };
