const { authService } = require('../services/auth.service');
const { sendRes, sendError } = require('../../shared');

function health(req, res) {
  return sendRes(res, { service: 'auth-service', status: 'running' }, 'OK');
}

async function register(req, res) {
  try {
    const result = await authService.register(req.body);
    return sendRes(res, result, '注册成功');
  } catch (err) {
    return sendError(res, err.message || '注册失败', err.httpStatus || 500);
  }
}

async function passwordLogin(req, res) {
  try {
    const result = await authService.passwordLogin(req.body);
    return sendRes(res, result, '登录成功');
  } catch (err) {
    return sendError(res, err.message || '登录失败', err.httpStatus || 500);
  }
}

async function sendCode(req, res) {
  try {
    await authService.sendCode(req.body);
    return sendRes(res, null, '验证码已发送');
  } catch (err) {
    return sendError(res, err.message || '发送失败', err.httpStatus || 500);
  }
}

async function smsLogin(req, res) {
  try {
    const result = await authService.smsLogin(req.body);
    return sendRes(res, result, '登录成功');
  } catch (err) {
    return sendError(res, err.message || '登录失败', err.httpStatus || 500);
  }
}

async function wxLogin(req, res) {
  try {
    const result = await authService.wxLogin(req.body);
    return sendRes(res, result, '微信登录成功');
  } catch (err) {
    return sendError(res, err.message || '微信登录失败', err.httpStatus || 500);
  }
}

async function qqLogin(req, res) {
  try {
    const result = await authService.qqLogin(req.body);
    return sendRes(res, result, 'QQ登录成功');
  } catch (err) {
    return sendError(res, err.message || 'QQ登录失败', err.httpStatus || 500);
  }
}

async function profile(req, res) {
  try {
    const result = await authService.profile(req.user.userId);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || '获取信息失败', err.httpStatus || 500);
  }
}

async function refresh(req, res) {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    return sendRes(res, result, 'Token 刷新成功');
  } catch (err) {
    return sendError(res, err.message || '刷新 Token 失败', err.httpStatus || 500);
  }
}

async function verify(req, res) {
  try {
    const result = await authService.verify(req.body.token);
    return sendRes(res, result, result.valid ? 'Token 有效' : 'Token 无效或已过期');
  } catch (err) {
    return sendError(res, err.message || '验证失败', err.httpStatus || 500);
  }
}

async function logout(req, res) {
  try {
    await authService.logout();
    return sendRes(res, null, '登出成功');
  } catch (err) {
    return sendError(res, err.message || '登出失败', err.httpStatus || 500);
  }
}

async function updateProfile(req, res) {
  try {
    await authService.updateProfile(req.user.userId, req.body);
    return sendRes(res, null, '更新成功');
  } catch (err) {
    return sendError(res, err.message || '更新失败', err.httpStatus || 500);
  }
}

module.exports = {
  health,
  register,
  passwordLogin,
  sendCode,
  smsLogin,
  wxLogin,
  qqLogin,
  profile,
  refresh,
  verify,
  logout,
  updateProfile,
};
