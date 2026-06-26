const { getRedisClient } = require('../config/redis');
const { mysqlPool } = require('../config/database');
const axios = require('axios');

// ==================== 配置 ====================
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'console'; // aliyun / tencent / console
const SMS_CODE_EXPIRE = parseInt(process.env.SMS_CODE_EXPIRE) || 300; // 5分钟
const SMS_COOLDOWN = parseInt(process.env.SMS_COOLDOWN) || 60; // 同号60s限发
const SMS_IP_LIMIT = parseInt(process.env.SMS_IP_LIMIT) || 20; // 同IP每日上限
const SMS_PHONE_LIMIT = parseInt(process.env.SMS_PHONE_LIMIT) || 10; // 同手机号每日上限

// ==================== 限频检查 ====================
async function checkRateLimit(phone, ip) {
  const redis = getRedisClient();
  if (!redis) throw new Error('Redis未连接，无法发送验证码');

  // 1) 同手机号 60s 限发
  const cooldownKey = `sms:cooldown:${phone}`;
  const cooldown = await redis.get(cooldownKey);
  if (cooldown) {
    const ttl = await redis.ttl(cooldownKey);
    throw new Error(`发送过于频繁，请${ttl}秒后再试`);
  }

  // 2) 同手机号当日发送上限
  const phoneDayKey = `sms:day:${phone}:${todayKey()}`;
  const phoneCount = await redis.incr(phoneDayKey);
  if (phoneCount === 1) {
    await redis.expire(phoneDayKey, 86400);
  }
  if (phoneCount > SMS_PHONE_LIMIT) {
    throw new Error('该手机号今日发送次数已达上限');
  }

  // 3) 同IP当日发送上限
  if (ip) {
    const ipDayKey = `sms:ip:${ip}:${todayKey()}`;
    const ipCount = await redis.incr(ipDayKey);
    if (ipCount === 1) {
      await redis.expire(ipDayKey, 86400);
    }
    if (ipCount > SMS_IP_LIMIT) {
      throw new Error('该IP今日发送次数已达上限');
    }
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // 2026-06-27
}

// ==================== 生成验证码 ====================
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ==================== 发送短信 ====================
async function sendSmsCode(phone, ip) {
  const redis = getRedisClient();
  if (!redis) throw new Error('Redis未连接，无法发送验证码');

  await checkRateLimit(phone, ip);

  const code = generateCode();
  const key = `sms:${phone}`;

  // 存验证码，5分钟过期
  await redis.set(key, code, { EX: SMS_CODE_EXPIRE });
  // 设冷却期 60s
  const cooldownKey = `sms:cooldown:${phone}`;
  await redis.set(cooldownKey, '1', { EX: SMS_COOLDOWN });

  // 写数据库日志
  try {
    await mysqlPool.execute(
      'INSERT INTO sms_send_log (phone, ip, provider, status) VALUES (?, ?, ?, ?)',
      [phone, ip || null, SMS_PROVIDER, 'sent']
    );
  } catch (e) {
    console.warn('[SMS] 写入发送日志失败:', e.message);
  }

  // 根据 provider 调用真实短信通道
  if (SMS_PROVIDER === 'aliyun') {
    await sendAliyunSms(phone, code);
  } else if (SMS_PROVIDER === 'tencent') {
    await sendTencentSms(phone, code);
  } else {
    // console 模式：仅打印到日志
    console.log(`[SMS-CONSOLE] 验证码: ${code} -> ${phone}`);
  }

  return code;
}

// ==================== 验证验证码 ====================
async function verifySmsCode(phone, code) {
  const redis = getRedisClient();
  if (!redis) throw new Error('Redis未连接');

  const key = `sms:${phone}`;
  const storedCode = await redis.get(key);

  if (!storedCode) return false;

  // 验证后删除（一次性使用）
  await redis.del(key);
  return storedCode === code;
}

// ==================== 阿里云短信 ====================
async function sendAliyunSms(phone, code) {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME || 'YourSignName';
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE || 'SMS_000000';
  const endpoint = process.env.ALIYUN_SMS_ENDPOINT || 'https://dysmsapi.aliyuncs.com';

  if (!accessKeyId || !accessKeySecret) {
    console.warn('[SMS-ALIYUN] 未配置 AccessKey，跳过真实发送');
    return;
  }

  // 简化版签名（生产环境建议用阿里云官方 SDK）
  const params = {
    PhoneNumbers: phone,
    SignName: signName,
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
    AccessKeyId: accessKeyId,
    Format: 'JSON',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: `${Date.now()}${Math.random().toString(36).slice(2)}`,
    SignatureVersion: '1.0',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Action: 'SendSms',
    Version: '2017-05-25',
  };

  // 构建签名字符串
  const sortedParams = Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(sortedParams)}`;
  const crypto = require('crypto');
  const signature = crypto.createHmac('sha1', accessKeySecret + '&').update(stringToSign).digest('base64');
  params.Signature = signature;

  const qs = Object.keys(params).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const resp = await axios.get(`${endpoint}/?${qs}`);

  if (resp.data.Code !== 'OK') {
    console.error('[SMS-ALIYUN] 发送失败:', resp.data);
    throw new Error('短信发送失败: ' + (resp.data.Message || '未知错误'));
  }
  console.log('[SMS-ALIYUN] 发送成功 ->', phone);
}

// ==================== 腾讯云短信 ====================
async function sendTencentSms(phone, code) {
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;
  const smsSdkAppId = process.env.TENCENT_SMS_SDK_APP_ID;
  const templateId = process.env.TENCENT_SMS_TEMPLATE_ID;
  const signName = process.env.TENCENT_SMS_SIGN_NAME || 'YourSignName';
  const endpoint = 'sms.tencentcloudapi.com';

  if (!secretId || !secretKey) {
    console.warn('[SMS-TENCENT] 未配置 SecretId，跳过真实发送');
    return;
  }

  // 腾讯云 SMS 走 SDK 更稳定，这里用 REST 简化调用
  const payload = {
    SmsSdkAppId: smsSdkAppId,
    SignName: signName,
    TemplateId: templateId,
    PhoneNumberSet: [`+86${phone}`],
    TemplateParamSet: [code, '5'],
  };

  // 简化版：实际生产建议用腾讯云官方 SDK
  try {
    const resp = await axios.post(
      'https://sms.tencentcloudapi.com',
      {
        Action: 'SendSms',
        Version: '2021-01-11',
        ...payload,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-TC-Action': 'SendSms',
          'X-TC-Version': '2021-01-11',
          'X-TC-Region': 'ap-guangzhou',
          'Authorization': `TC3-HMAC-SHA256 Credential=${secretId}`,
        },
      }
    );
    if (resp.data.Response?.Error) {
      console.error('[SMS-TENCENT] 发送失败:', resp.data.Response.Error);
      throw new Error('短信发送失败: ' + resp.data.Response.Error.Message);
    }
    console.log('[SMS-TENCENT] 发送成功 ->', phone);
  } catch (err) {
    console.error('[SMS-TENCENT] 请求异常:', err.message);
    throw new Error('短信发送失败');
  }
}

module.exports = { sendSmsCode, verifySmsCode };
