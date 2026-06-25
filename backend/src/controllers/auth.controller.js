const bcrypt = require('bcryptjs');
const { mysqlPool } = require('../config/database');
const { authenticateToken, generateToken } = require('../middleware/auth.middleware');
const { sendSmsCode, verifySmsCode } = require('../utils/sms.util');
const { sendRes, sendError } = require('../utils/response.util');

// 注册
async function register(req, res) {
  try {
    const { phone, password, nickname } = req.body;

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

    const result = await mysqlPool.execute(
      'INSERT INTO users (phone, password, nickname) VALUES (?, ?, ?)',
      [phone, hashedPassword, nickname || phone]
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
    const { phone, code } = req.body;

    if (!phone || !code) {
      return sendError(res, '手机号和验证码不能为空', 400);
    }

    const isValid = await verifySmsCode(phone, code);
    if (!isValid) {
      return sendError(res, '验证码错误或已过期', 400);
    }

    const [users] = await mysqlPool.execute(
      'SELECT id, phone, nickname, avatar, created_at FROM users WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      // 自动注册
      const result = await mysqlPool.execute(
        'INSERT INTO users (phone, nickname) VALUES (?, ?)',
        [phone, phone]
      );
      const token = generateToken({ userId: result.insertId, phone });
      return sendRes(res, {
        userId: result.insertId,
        token,
        user: { id: result.insertId, phone, nickname: phone },
      }, '登录成功（新用户自动注册）');
    }

    const token = generateToken({ userId: users[0].id, phone: users[0].phone });
    sendRes(res, {
      userId: users[0].id,
      token,
      user: users[0],
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

    await sendSmsCode(phone);
    sendRes(res, null, '验证码已发送（查看服务器日志获取验证码）');
  } catch (err) {
    console.error('发送验证码错误:', err);
    sendError(res, '发送失败', 500);
  }
}

// 密码登录
async function passwordLogin(req, res) {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return sendError(res, '手机号和密码不能为空', 400);
    }

    const [users] = await mysqlPool.execute(
      'SELECT id, phone, password, nickname, avatar FROM users WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      return sendError(res, '手机号或密码错误', 400);
    }

    const isValid = await bcrypt.compare(password, users[0].password);
    if (!isValid) {
      return sendError(res, '手机号或密码错误', 400);
    }

    const token = generateToken({ userId: users[0].id, phone: users[0].phone });
    const { password: _, ...user } = users[0];

    sendRes(res, { userId: users[0].id, token, user }, '登录成功');
  } catch (err) {
    console.error('密码登录错误:', err);
    sendError(res, '登录失败', 500);
  }
}

// 获取当前用户信息
async function getProfile(req, res) {
  try {
    const [users] = await mysqlPool.execute(
      'SELECT id, phone, nickname, avatar, created_at FROM users WHERE id = ?',
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
