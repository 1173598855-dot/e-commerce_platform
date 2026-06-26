const { mysqlPool } = require('../config/database');
const { generateToken } = require('../middleware/auth.middleware');
const { sendRes, sendError } = require('../utils/response.util');
const axios = require('axios');

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || '';
}

// ==================== 微信小程序登录（真实链路）====================
async function wxLogin(req, res) {
  try {
    const { code, nickname, avatar, device_id } = req.body;

    if (!code) {
      return sendError(res, '微信code不能为空', 400);
    }

    const wxAppId = process.env.WX_APP_ID;
    const wxSecret = process.env.WX_SECRET;

    if (!wxAppId || !wxSecret) {
      return sendError(res, '微信配置未就绪，请联系管理员', 500);
    }

    // 1) 用 code 换 access_token + openid
    const tokenResp = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: wxAppId,
        secret: wxSecret,
        js_code: code,
        grant_type: 'authorization_code',
      },
      timeout: 10000,
    });

    const { openid, unionid, session_key, errcode, errmsg } = tokenResp.data;

    if (errcode) {
      console.error('[WX-LOGIN] 微信返回错误:', errcode, errmsg);
      return sendError(res, '微信登录失败: ' + (errmsg || '未知错误'), 400);
    }

    if (!openid) {
      return sendError(res, '微信登录失败：未获取到openid', 400);
    }

    const ip = getClientIp(req);

    // 2) 用 openid 匹配用户，优先用 unionid（跨平台）
    let querySql = 'SELECT * FROM users WHERE wechat_openid = ?';
    let queryParams = [openid];

    if (unionid) {
      // 有 unionid 时，优先按 unionid 查
      querySql = 'SELECT * FROM users WHERE wechat_unionid = ? OR wechat_openid = ?';
      queryParams = [unionid, openid];
    }

    let [users] = await mysqlPool.execute(querySql, queryParams);

    if (users.length === 0) {
      // 3) 新用户：创建账号
      const insertResult = await mysqlPool.execute(
        'INSERT INTO users (phone, nickname, avatar, wechat_openid, wechat_unionid, register_source, device_id, last_login_ip, last_login_time, status_desc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)',
        [
          `wx_${openid}`,
          nickname || '微信用户',
          avatar || '',
          openid,
          unionid || null,
          'wechat',
          device_id || null,
          ip || null,
          'active',
        ]
      );
      users = [{
        id: insertResult.insertId,
        phone: `wx_${openid}`,
        nickname: nickname || '微信用户',
        avatar: avatar || '',
        wechat_openid: openid,
        wechat_unionid: unionid || null,
      }];
    } else {
      // 4) 已有用户：补全 unionid（首次绑定时）
      const user = users[0];
      if (unionid && !user.wechat_unionid) {
        await mysqlPool.execute(
          'UPDATE users SET wechat_unionid = ?, last_login_time = NOW(), last_login_ip = ? WHERE id = ?',
          [unionid, ip || null, user.id]
        );
        user.wechat_unionid = unionid;
      } else {
        await mysqlPool.execute(
          'UPDATE users SET last_login_time = NOW(), last_login_ip = ? WHERE id = ?',
          [ip || null, user.id]
        );
      }
    }

    // 5) 签发 JWT
    const user = users[0];
    const token = generateToken({ userId: user.id, phone: user.phone });

    sendRes(res, {
      userId: user.id,
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        register_source: 'wechat',
      },
    }, '微信登录成功');
  } catch (err) {
    console.error('[WX-LOGIN] 微信登录异常:', err.message);
    sendError(res, '微信登录失败: ' + err.message, 500);
  }
}

// ==================== QQ登录 ====================
async function qqLogin(req, res) {
  try {
    const { openid, nickname, avatar, device_id } = req.body;

    if (!openid) {
      return sendError(res, 'QQ openid不能为空', 400);
    }

    const ip = getClientIp(req);

    let [users] = await mysqlPool.execute('SELECT * FROM users WHERE qq_openid = ?', [openid]);

    if (users.length === 0) {
      const result = await mysqlPool.execute(
        'INSERT INTO users (phone, nickname, avatar, qq_openid, register_source, device_id, last_login_ip, last_login_time, status_desc) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)',
        [`qq_${openid}`, nickname || 'QQ用户', avatar || '', openid, 'qq', device_id || null, ip || null, 'active']
      );
      users = [{ id: result.insertId, phone: `qq_${openid}`, nickname: nickname || 'QQ用户', avatar: avatar || '' }];
    } else {
      await mysqlPool.execute(
        'UPDATE users SET last_login_time = NOW(), last_login_ip = ? WHERE id = ?',
        [ip || null, users[0].id]
      );
    }

    const token = generateToken({ userId: users[0].id, phone: users[0].phone });
    sendRes(res, {
      userId: users[0].id,
      token,
      user: { id: users[0].id, nickname: users[0].nickname, avatar: users[0].avatar, register_source: 'qq' },
    }, 'QQ登录成功');
  } catch (err) {
    console.error('QQ登录错误:', err);
    sendError(res, 'QQ登录失败', 500);
  }
}

module.exports = { wxLogin, qqLogin };
