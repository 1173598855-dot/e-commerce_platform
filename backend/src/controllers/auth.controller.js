const bcrypt = require('bcryptjs');
const { mysqlPool } = require('../config/database');
const { authenticateToken, generateToken } = require('../middleware/auth.middleware');
const { sendSmsCode, verifySmsCode } = require('../utils/sms.util');
const { sendRes, sendError } = require('../utils/response.util');

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || '';
}

function recordLoginInfo(userId, ip, deviceId, loginType) {
  const updates = ['last_login_time = NOW()'];
  const params = [];
  if (ip) { updates.push('last_login_ip = ?'); params.push(ip); }
  if (deviceId) { updates.push('device_id = ?'); params.push(deviceId); }
  if (loginType) { updates.push('login_type = ?'); params.push(loginType); }
  params.push(userId);
  return mysqlPool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
}

// 注册
async function register(req, res) {
  try {
    const { phone, password, nickname, device_id } = req.body;

    if (!phone || !password) {
      return sendError(res, '手机号和密码不能为空', 400);
    }

    const [existing] = await mysqlPool.execute(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );

    if (existing.length > 0) {
      return sendError(res, '该手机号已注册', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const ip = getClientIp(req);

    const result = await mysqlPool.execute(
      'INSERT INTO users (phone, password, nickname, register_source, device_id, last_login_ip, last_login_time, status_desc) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)',
      [phone, hashedPassword, nickname || phone, 'app', device_id || null, ip || null, 'active']
    );

    const userId = result.insertId;
    const token = generateToken({ userId, phone });

    sendRes(res, { userId, token }, '注册成功');
  } catch (err) {
    console.error('注册错误:', err);
    sendError(res, '注册失败', 500);
  }
}

// 手机号+验证码登录
async function smsLogin(req, res) {
  try {
    const { phone, code, device_id } = req.body;

    if (!phone || !code) {
      return sendError(res, '手机号和验证码不能为空', 400);
    }

    const isValid = await verifySmsCode(phone, code);
    if (!isValid) {
      return sendError(res, '验证码错误或已过期', 400);
    }

    const ip = getClientIp(req);
    const [users] = await mysqlPool.execute(
      'SELECT id, phone, nickname, avatar, status, status_desc, created_at FROM users WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      // 自动注册
      const result = await mysqlPool.execute(
        'INSERT INTO users (phone, nickname, register_source, device_id, last_login_ip, last_login_time, status_desc) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
        [phone, phone, 'app', device_id || null, ip || null, 'active']
      );
      const token = generateToken({ userId: result.insertId, phone });
      return sendRes(res, {
        userId: result.insertId,
        token,
        user: { id: result.insertId, phone, nickname: phone, status_desc: 'active' },
      }, '登录成功（新用户自动注册）');
    }

    const user = users[0];

    // 状态校验
    if (user.status === 0 || user.status_desc === 'frozen') {
      return sendError(res, '账号已被冻结，请联系客服', 403);
    }
    if (user.status_desc === 'deactivating') {
      return sendError(res, '账号注销中，无法登录', 403);
    }

    await recordLoginInfo(user.id, ip, device_id, 'sms');

    const token = generateToken({ userId: user.id, phone: user.phone });
    sendRes(res, {
      userId: user.id,
      token,
      user: { id: user.id, phone: user.phone, nickname: user.nickname, avatar: user.avatar, status_desc: user.status_desc },
    }, '登录成功');
  } catch (err) {
    console.error('登录错误:', err);
    sendError(res, '登录失败', 500);
  }
}

// 发送验证码
async function sendCode(req, res) {
  try {
    const { phone } = req.body;

    if (!phone) {
      return sendError(res, '手机号不能为空', 400);
    }

    const ip = getClientIp(req);
    await sendSmsCode(phone, ip);
    sendRes(res, null, '验证码已发送');
  } catch (err) {
    console.error('发送验证码错误:', err);
    sendError(res, err.message || '发送失败', 400);
  }
}

// 密码登录
async function passwordLogin(req, res) {
  try {
    const { phone, password, device_id } = req.body;

    if (!phone || !password) {
      return sendError(res, '手机号和密码不能为空', 400);
    }

    const [users] = await mysqlPool.execute(
      'SELECT id, phone, password, nickname, avatar, status, status_desc FROM users WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      return sendError(res, '手机号或密码错误', 400);
    }

    const user = users[0];

    if (user.status === 0 || user.status_desc === 'frozen') {
      return sendError(res, '账号已被冻结，请联系客服', 403);
    }
    if (user.status_desc === 'deactivating') {
      return sendError(res, '账号注销中，无法登录', 403);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return sendError(res, '手机号或密码错误', 400);
    }

    const ip = getClientIp(req);
    await recordLoginInfo(user.id, ip, device_id, 'password');

    const token = generateToken({ userId: user.id, phone: user.phone });
    const { password: _, ...safeUser } = user;

    sendRes(res, { userId: user.id, token, user: safeUser }, '登录成功');
  } catch (err) {
    console.error('密码登录错误:', err);
    sendError(res, '登录失败', 500);
  }
}

// 获取当前用户信息
async function getProfile(req, res) {
  try {
    const [users] = await mysqlPool.execute(
      'SELECT id, phone, nickname, avatar, status_desc, register_source, last_login_time, last_login_ip, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return sendError(res, '用户不存在', 404);
    }

    sendRes(res, users[0]);
  } catch (err) {
    sendError(res, '获取用户信息失败', 500);
  }
}

// 更新用户资料
async function updateProfile(req, res) {
  try {
    const { nickname, avatar } = req.body;
    const updates = [];
    const params = [];

    if (nickname) {
      updates.push('nickname = ?');
      params.push(nickname);
    }
    if (avatar) {
      updates.push('avatar = ?');
      params.push(avatar);
    }

    if (updates.length === 0) {
      return sendError(res, '没有需要更新的字段', 400);
    }

    params.push(req.user.userId);

    await mysqlPool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [users] = await mysqlPool.execute(
      'SELECT id, phone, nickname, avatar, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    sendRes(res, users[0], '更新成功');
  } catch (err) {
    console.error('更新资料错误:', err);
    sendError(res, '更新失败', 500);
  }
}

module.exports = {
  register,
  smsLogin,
  sendCode,
  passwordLogin,
  getProfile,
  updateProfile,
};
