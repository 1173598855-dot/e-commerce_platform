// ==================== 统一错误码 ====================
// 前后端一致，App 端根据 code 做差异化处理
const ERROR_CODES = {
  // 成功
  OK:                    { code: 10000, httpStatus: 200, message: '成功' },

  // 参数错误
  PARAM_ERROR:           { code: 20000, httpStatus: 400, message: '参数错误' },
  PARAM_MISSING:         { code: 20001, httpStatus: 400, message: '缺少必要参数' },
  PARAM_INVALID:         { code: 20002, httpStatus: 400, message: '参数格式不正确' },

  // 鉴权失败
  UNAUTHORIZED:          { code: 30000, httpStatus: 401, message: '请先登录' },
  TOKEN_EXPIRED:         { code: 30001, httpStatus: 401, message: 'Token已过期，请重新登录' },
  TOKEN_INVALID:         { code: 30002, httpStatus: 401, message: 'Token无效' },
  TOKEN_REFRESH_EXPIRED: { code: 30003, httpStatus: 401, message: 'RefreshToken已过期，请重新登录' },
  FORBIDDEN:             { code: 30010, httpStatus: 403, message: '无权限访问' },
  ACCOUNT_FROZEN:        { code: 30011, httpStatus: 403, message: '账号已被冻结' },
  ACCOUNT_DEACTIVATING:  { code: 30012, httpStatus: 403, message: '账号注销中，无法操作' },
  KICKED_OUT:            { code: 30020, httpStatus: 401, message: '您的账号在其他设备登录' },

  // 业务失败
  BUSINESS_ERROR:        { code: 40000, httpStatus: 400, message: '业务处理失败' },
  USER_NOT_FOUND:        { code: 40001, httpStatus: 404, message: '用户不存在' },
  USER_ALREADY_EXISTS:   { code: 40002, httpStatus: 400, message: '该手机号已注册' },
  PASSWORD_WRONG:        { code: 40003, httpStatus: 400, message: '手机号或密码错误' },
  SMS_CODE_EXPIRED:      { code: 40010, httpStatus: 400, message: '验证码已过期' },
  SMS_CODE_WRONG:        { code: 40011, httpStatus: 400, message: '验证码错误' },
  SMS_SEND_TOO_FREQUENT: { code: 40012, httpStatus: 429, message: '发送过于频繁，请稍后再试' },
  SMS_SEND_DAILY_LIMIT:  { code: 40013, httpStatus: 429, message: '今日发送次数已达上限' },
  PRODUCT_NOT_FOUND:     { code: 40020, httpStatus: 404, message: '商品不存在' },
  STOCK_NOT_ENOUGH:      { code: 40021, httpStatus: 400, message: '库存不足' },
  ORDER_NOT_FOUND:       { code: 40030, httpStatus: 404, message: '订单不存在' },
  COUPON_NOT_AVAILABLE:  { code: 40040, httpStatus: 400, message: '优惠券不可用' },

  // 系统异常
  SYSTEM_ERROR:          { code: 50000, httpStatus: 500, message: '系统异常' },
  SERVICE_UNAVAILABLE:   { code: 50001, httpStatus: 503, message: '服务暂时不可用' },
  GATEWAY_TIMEOUT:       { code: 50002, httpStatus: 504, message: '请求超时' },
  RATE_LIMITED:          { code: 50003, httpStatus: 429, message: '请求过于频繁' },
  ROUTE_NOT_FOUND:       { code: 50004, httpStatus: 404, message: '接口不存在' },
};

function getErrorCode(name) {
  return ERROR_CODES[name] || ERROR_CODES.SYSTEM_ERROR;
}

module.exports = { ERROR_CODES, getErrorCode };
