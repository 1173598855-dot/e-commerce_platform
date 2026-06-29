const { sendRes, sendError } = require('../../shared');
const { userService } = require('../services/user.service');

function health(req, res) {
  return sendRes(res, { service: 'user-service', status: 'running' }, 'OK');
}

async function getAddressList(req, res) {
  try {
    const rows = await userService.listAddresses(req.user.userId);
    return sendRes(res, rows);
  } catch (err) {
    return sendError(res, err.message || '获取地址失败', err.httpStatus || 500);
  }
}

async function addAddress(req, res) {
  try {
    const result = await userService.createAddress(req.user.userId, req.body);
    return sendRes(res, result, '地址添加成功');
  } catch (err) {
    return sendError(res, err.message || '添加地址失败', err.httpStatus || 500);
  }
}

async function updateAddress(req, res) {
  try {
    await userService.updateAddress(req.user.userId, req.params.id, req.body);
    return sendRes(res, null, '地址更新成功');
  } catch (err) {
    return sendError(res, err.message || '更新地址失败', err.httpStatus || 500);
  }
}

async function deleteAddress(req, res) {
  try {
    await userService.deleteAddress(req.user.userId, req.params.id);
    return sendRes(res, null, '地址已删除');
  } catch (err) {
    return sendError(res, err.message || '删除地址失败', err.httpStatus || 500);
  }
}

async function getDefaultAddress(req, res) {
  try {
    const result = await userService.defaultAddress(req.user.userId);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || '获取默认地址失败', err.httpStatus || 500);
  }
}

async function favoriteProduct(req, res) {
  try {
    await userService.favoriteProduct(req.user.userId, req.body);
    return sendRes(res, null, '已收藏');
  } catch (err) {
    return sendError(res, err.message || '收藏失败', err.httpStatus || 500);
  }
}

async function unfavoriteProduct(req, res) {
  try {
    await userService.unfavoriteProduct(req.user.userId, req.body);
    return sendRes(res, null, '已取消收藏');
  } catch (err) {
    return sendError(res, err.message || '取消收藏失败', err.httpStatus || 500);
  }
}

async function getFavorites(req, res) {
  try {
    const result = await userService.getFavorites(req.user.userId, req.query);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || '获取收藏失败', err.httpStatus || 500);
  }
}

async function checkFavorite(req, res) {
  try {
    const result = await userService.checkFavorite(req.user.userId, req.params.product_id);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || '查询失败', err.httpStatus || 500);
  }
}

async function getCouponList(req, res) {
  try {
    const result = await userService.getCoupons();
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || '获取优惠券失败', err.httpStatus || 500);
  }
}

async function receiveCoupon(req, res) {
  try {
    await userService.receiveCoupon(req.user.userId, req.body);
    return sendRes(res, null, '领取成功');
  } catch (err) {
    return sendError(res, err.message || '领取失败', err.httpStatus || 500);
  }
}

async function getUserCoupons(req, res) {
  try {
    const result = await userService.getUserCoupons(req.user.userId, req.query);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || '获取优惠券失败', err.httpStatus || 500);
  }
}

async function useCoupon(req, res) {
  try {
    const result = await userService.useCoupon(req.user.userId, req.body);
    return sendRes(res, result, '优惠券使用成功');
  } catch (err) {
    return sendError(res, err.message || '使用失败', err.httpStatus || 500);
  }
}

async function getPoints(req, res) {
  try {
    const result = await userService.getPoints(req.user.userId);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || '获取积分失败', err.httpStatus || 500);
  }
}

async function addPoints(req, res) {
  try {
    const result = await userService.addPoints(req.user.userId, req.body);
    return sendRes(res, result, '积分变更成功');
  } catch (err) {
    return sendError(res, err.message || '积分操作失败', err.httpStatus || 500);
  }
}

async function consumePoints(req, res) {
  try {
    const result = await userService.consumePoints(req.user.userId, req.body);
    return sendRes(res, result, '积分消费成功');
  } catch (err) {
    return sendError(res, err.message || '积分消费失败', err.httpStatus || 500);
  }
}

async function getPointsLogs(req, res) {
  try {
    const result = await userService.getPointsLogs(req.user.userId, req.query);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || '获取积分日志失败', err.httpStatus || 500);
  }
}

async function applyMerchant(req, res) {
  try {
    const result = await userService.applyMerchant(req.body);
    return sendRes(res, result, '入驻申请已提交，等待审核');
  } catch (err) {
    return sendError(res, err.message || '申请失败', err.httpStatus || 500);
  }
}

async function getMerchantInfo(req, res) {
  try {
    const result = await userService.getMerchantInfo(req.user.merchantId || 0);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || '获取商家信息失败', err.httpStatus || 500);
  }
}

async function getMerchantProducts(req, res) {
  try {
    const result = await userService.getMerchantProducts(req.user.merchantId, req.query);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || '获取商品列表失败', err.httpStatus || 500);
  }
}

module.exports = {
  health,
  getAddressList,
  addAddress,
  updateAddress,
  deleteAddress,
  getDefaultAddress,
  favoriteProduct,
  unfavoriteProduct,
  getFavorites,
  checkFavorite,
  getCouponList,
  receiveCoupon,
  getUserCoupons,
  useCoupon,
  getPoints,
  addPoints,
  consumePoints,
  getPointsLogs,
  applyMerchant,
  getMerchantInfo,
  getMerchantProducts,
};
