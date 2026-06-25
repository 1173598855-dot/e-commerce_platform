const { mysqlPool } = require('../config/database');
const { authenticateToken, generateToken } = require('../middleware/auth.middleware');
const { sendRes, sendError } = require('../utils/response.util');
const axios = require('axios');

// 微信登录
async function wxLogin(req, res) {
  try {
    const { code, nickname, avatar } = req.body;

    if (!code) {
      return sendError(res, '微信code不能为空', 400);
    }

    // 调用微信API获取openid
    const wxAppId = process.env.WX_APP_ID || 'your_wx_app_id';
    const wxSecret = process.env.WX_SECRET || 'your_wx_secret';
    
    const wxResult = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: { appid: wxAppId, secret: wxSecret, js_code: code, grant_type: 'authorization_code' }
    });

    const { openid, unionid } = wxResult.data;

    if (!openid) {
      return sendError(res, '微信登录失败', 400);
    }

    // 查询或创建用户
    let [users] = await mysqlPool.execute('SELECT * FROM users WHERE openid = ?', [openid]);

    if (users.length === 0) {
      // 创建新用户
      const result = await mysqlPool.execute(
        'INSERT INTO users (phone, nickname, avatar, openid, status) VALUES (?, ?, ?, ?, 1)',
        [`wx_${openid}`, nickname || '微信用户', avatar || '', openid]
      );
      users = [{ id: result.insertId, phone: `wx_${openid}`, nickname: nickname || '微信用户', avatar: avatar || '' }];
    }

    const token = generateToken({ userId: users[0].id, phone: users[0].phone });
    sendRes(res, {
      userId: users[0].id,
      token,
      user: { id: users[0].id, nickname: users[0].nickname, avatar: users[0].avatar },
    }, '微信登录成功');
  } catch (err) {
    console.error('微信登录错误:', err);
    sendError(res, '微信登录失败', 500);
  }
}

// QQ登录
async function qqLogin(req, res) {
  try {
    const { openid, nickname, avatar } = req.body;

    if (!openid) {
      return sendError(res, 'QQ openid不能为空', 400);
    }

    let [users] = await mysqlPool.execute('SELECT * FROM users WHERE qq_openid = ?', [openid]);

    if (users.length === 0) {
      const result = await mysqlPool.execute(
        'INSERT INTO users (phone, nickname, avatar, qq_openid, status) VALUES (?, ?, ?, ?, 1)',
        [`qq_${openid}`, nickname || 'QQ用户', avatar || '', openid]
      );
      users = [{ id: result.insertId, phone: `qq_${openid}`, nickname: nickname || 'QQ用户', avatar: avatar || '' }];
    }

    const token = generateToken({ userId: users[0].id, phone: users[0].phone });
    sendRes(res, {
      userId: users[0].id,
      token,
      user: { id: users[0].id, nickname: users[0].nickname, avatar: users[0].avatar },
    }, 'QQ登录成功');
  } catch (err) {
    console.error('QQ登录错误:', err);
    sendError(res, 'QQ登录失败', 500);
  }
}

module.exports = { wxLogin, qqLogin };
