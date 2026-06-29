const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const redis = require('redis');
const mysql = require('mysql2/promise');
const { JWT_SECRET, generateToken } = require('../../shared');
const { createAuthPayload } = require('../auth-utils');

function toPublicUser(user) {
  const { password, ...publicUser } = user;
  return publicUser;
}

class AuthService {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'ecommerce',
      connectionLimit: 10,
    });
    this.redisClient = null;
  }

  async initRedis() {
    try {
      this.redisClient = redis.createClient({
        socket: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT) || 6379 },
      });
      this.redisClient.on('error', (err) => console.warn('Redis Error:', err.message));
      await this.redisClient.connect();
      console.log('Redis connected');
    } catch (err) {
      console.warn('Redis unavailable:', err.message);
      this.redisClient = null;
    }
  }

  async register(body) {
    const { phone, password, nickname } = body;
    if (!phone || !password) throw Object.assign(new Error('手机号和密码不能为空'), { httpStatus: 400 });
    const [existing] = await this.pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0) throw Object.assign(new Error('该手机号已注册'), { httpStatus: 400 });
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await this.pool.query('INSERT INTO users (phone, password, nickname) VALUES (?, ?, ?)', [phone, hashed, nickname || phone]);
    const user = { id: result.insertId, phone, nickname: nickname || phone };
    return createAuthPayload(user);
  }

  async passwordLogin(body) {
    const { phone, password } = body;
    if (!phone || !password) throw Object.assign(new Error('手机号和密码不能为空'), { httpStatus: 400 });
    const [users] = await this.pool.query('SELECT id, phone, password, nickname, avatar, points, status FROM users WHERE phone = ?', [phone]);
    if (users.length === 0) throw Object.assign(new Error('手机号或密码错误'), { httpStatus: 400 });
    if (users[0].status === 0) throw Object.assign(new Error('账号已被禁用'), { httpStatus: 403 });
    const valid = await bcrypt.compare(password, users[0].password);
    if (!valid) throw Object.assign(new Error('手机号或密码错误'), { httpStatus: 400 });
    const user = toPublicUser(users[0]);
    await this.pool.query('UPDATE users SET last_login_time = NOW() WHERE id = ?', [user.id]);
    return createAuthPayload(user);
  }

  async sendCode(body) {
    const { phone } = body;
    if (!phone) throw Object.assign(new Error('手机号不能为空'), { httpStatus: 400 });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (!this.redisClient) {
      throw Object.assign(new Error('短信服务暂时不可用，请稍后再试'), { httpStatus: 500 });
    }
    await this.redisClient.set(`sms:${phone}`, code, { EX: parseInt(process.env.SMS_CODE_EXPIRE) || 300 });
    console.log(`[SMS] ${phone} -> ${code}`);
  }

  async smsLogin(body) {
    const { phone, code } = body;
    if (!phone || !code) throw Object.assign(new Error('手机号和验证码不能为空'), { httpStatus: 400 });
    if (!this.redisClient) {
      throw Object.assign(new Error('验证码服务暂时不可用，请稍后再试'), { httpStatus: 503 });
    }
    const storedCode = await this.redisClient.get(`sms:${phone}`);
    if (storedCode !== code) throw Object.assign(new Error('验证码错误或已过期'), { httpStatus: 400 });
    await this.redisClient.del(`sms:${phone}`);

    const [users] = await this.pool.query('SELECT id, phone, nickname, avatar, points, status FROM users WHERE phone = ?', [phone]);
    let user;
    if (users.length === 0) {
      const [result] = await this.pool.query("INSERT INTO users (phone, nickname, login_type) VALUES (?, ?, 'sms')", [phone, '用户' + phone.slice(-4)]);
      user = { id: result.insertId, phone, nickname: '用户' + phone.slice(-4), avatar: null, points: 0 };
    } else {
      user = users[0];
      if (user.status === 0) throw Object.assign(new Error('账号已被禁用'), { httpStatus: 403 });
      await this.pool.query('UPDATE users SET last_login_time = NOW() WHERE id = ?', [user.id]);
    }
    return createAuthPayload(user);
  }

  async wxLogin(body) {
    const { code } = body;
    if (!code) throw Object.assign(new Error('微信授权码不能为空'), { httpStatus: 400 });
    const openid = 'wx_demo_' + code;
    const [users] = await this.pool.query('SELECT id, phone, nickname, avatar, points, status FROM users WHERE wechat_openid = ?', [openid]);
    let user;
    if (users.length === 0) {
      const [result] = await this.pool.query("INSERT INTO users (phone, nickname, wechat_openid, login_type) VALUES (?, ?, ?, 'wechat')", ['', '微信用户', openid]);
      user = { id: result.insertId, nickname: '微信用户' };
    } else {
      user = users[0];
      if (user.status === 0) throw Object.assign(new Error('账号已被禁用'), { httpStatus: 403 });
      await this.pool.query('UPDATE users SET last_login_time = NOW() WHERE id = ?', [user.id]);
    }
    return createAuthPayload(user);
  }

  async qqLogin(body) {
    const { code } = body;
    if (!code) throw Object.assign(new Error('QQ授权码不能为空'), { httpStatus: 400 });
    const openid = 'qq_demo_' + code;
    const [users] = await this.pool.query('SELECT id, phone, nickname, avatar, points, status FROM users WHERE qq_openid = ?', [openid]);
    let user;
    if (users.length === 0) {
      const [result] = await this.pool.query("INSERT INTO users (phone, nickname, qq_openid, login_type) VALUES (?, ?, ?, 'qq')", ['', 'QQ用户', openid]);
      user = { id: result.insertId, nickname: 'QQ用户' };
    } else {
      user = users[0];
      if (user.status === 0) throw Object.assign(new Error('账号已被禁用'), { httpStatus: 403 });
      await this.pool.query('UPDATE users SET last_login_time = NOW() WHERE id = ?', [user.id]);
    }
    return createAuthPayload(user);
  }

  async profile(userId) {
    const [users] = await this.pool.query('SELECT id, phone, nickname, avatar, points, created_at FROM users WHERE id = ?', [userId]);
    if (users.length === 0) throw Object.assign(new Error('用户不存在'), { httpStatus: 404 });
    return users[0];
  }

  async refresh(refreshToken) {
    if (!refreshToken) throw Object.assign(new Error('refreshToken 不能为空'), { httpStatus: 400 });
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err) {
      throw Object.assign(new Error('refreshToken 无效或已过期'), { httpStatus: 401 });
    }
    const [users] = await this.pool.query('SELECT id, phone, nickname, avatar, points, status FROM users WHERE id = ?', [decoded.userId]);
    if (users.length === 0) throw Object.assign(new Error('用户不存在'), { httpStatus: 404 });
    if (users[0].status === 0) throw Object.assign(new Error('账号已被禁用'), { httpStatus: 403 });
    const user = users[0];
    const accessToken = generateToken({ userId: user.id, phone: user.phone });
    const newRefreshToken = jwt.sign({ userId: user.id, phone: user.phone, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
    return { accessToken, refreshToken: newRefreshToken, user };
  }

  async verify(token) {
    if (!token) throw Object.assign(new Error('token 不能为空'), { httpStatus: 400 });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { valid: true, user: decoded };
    } catch (err) {
      return { valid: false };
    }
  }

  async logout() {
    return null;
  }

  async updateProfile(userId, body) {
    const { nickname, avatar } = body;
    const fields = [];
    const params = [];
    if (nickname) { fields.push('nickname = ?'); params.push(nickname); }
    if (avatar) { fields.push('avatar = ?'); params.push(avatar); }
    if (fields.length === 0) throw Object.assign(new Error('没有需要更新的字段'), { httpStatus: 400 });
    params.push(userId);
    await this.pool.query('UPDATE users SET ' + fields.join(', ') + ' WHERE id = ?', params);
    return null;
  }
}

const authService = new AuthService();

module.exports = { authService, toPublicUser };
