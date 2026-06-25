const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

// 获取可用优惠券列表
async function getCouponList(req, res) {
  try {
    const now = new Date();

    const [coupons] = await mysqlPool.execute(
      `SELECT *, 
       CASE 
         WHEN type = 1 THEN CONCAT('满', condition_amount, '减', discount_amount)
         WHEN type = 2 THEN CONCAT(discount_amount, '折')
         ELSE CONCAT('无门槛立减', discount_amount)
       END as display_text
       FROM coupons 
       WHERE status = 1 
         AND valid_start <= ? 
         AND valid_end >= ?
         AND issued_count < total_count
       ORDER BY discount_amount DESC`,
      [now, now]
    );

    sendRes(res, coupons);
  } catch (err) {
    sendError(res, '获取优惠券失败', 500);
  }
}

// 领取优惠券
async function receiveCoupon(req, res) {
  try {
    const userId = req.user.userId;
    const { coupon_id } = req.body;

    if (!coupon_id) {
      return sendError(res, '优惠券ID不能为空', 400);
    }

    // 检查优惠券是否存在且可领取
    const [coupons] = await mysqlPool.execute(
      'SELECT * FROM coupons WHERE id = ? AND status = 1',
      [coupon_id]
    );

    if (coupons.length === 0) {
      return sendError(res, '优惠券不存在', 404);
    }

    const coupon = coupons[0];

    // 检查有效期
    const now = new Date();
    if (now < new Date(coupon.valid_start) || now > new Date(coupon.valid_end)) {
      return sendError(res, '优惠券不在有效期内', 400);
    }

    // 检查每人领取限制
    const [owned] = await mysqlPool.execute(
      'SELECT COUNT(*) as count FROM user_coupons WHERE user_id = ? AND coupon_id = ? AND status = 1',
      [userId, coupon_id]
    );

    if (coupon.per_user_limit > 0 && owned[0].count >= coupon.per_user_limit) {
      return sendError(res, '您已领取过该优惠券', 400);
    }

    // 检查总库存
    if (coupon.total_count > 0 && coupon.issued_count >= coupon.total_count) {
      return sendError(res, '优惠券已领完', 400);
    }

    // 领取优惠券
    const expiresAt = new Date(coupon.valid_end);

    await mysqlPool.execute(
      'INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)',
      [userId, coupon_id, expiresAt]
    );

    // 更新发放数量
    await mysqlPool.execute(
      'UPDATE coupons SET issued_count = issued_count + 1 WHERE id = ?',
      [coupon_id]
    );

    sendRes(res, null, '领取成功');
  } catch (err) {
    console.error('领取优惠券错误:', err);
    sendError(res, '领取失败', 500);
  }
}

// 获取用户优惠券
async function getUserCoupons(req, res) {
  try {
    const userId = req.user.userId;
    const status = req.query.status || 'all'; // all, available, used, expired

    let query = `
      SELECT uc.*, c.name, c.type, c.condition_amount, c.discount_amount, 
             c.valid_start, c.valid_end, c.min_order_amount
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.user_id = ?
    `;
    const params = [userId];

    if (status === 'available') {
      query += ' AND uc.status = 1 AND uc.expires_at > NOW()';
    } else if (status === 'used') {
      query += ' AND uc.status = 2';
    } else if (status === 'expired') {
      query += ' AND (uc.status = 3 OR uc.expires_at <= NOW())';
    }

    query += ' ORDER BY uc.expires_at ASC';

    const [coupons] = await mysqlPool.execute(query, params);

    sendRes(res, coupons);
  } catch (err) {
    sendError(res, '获取优惠券失败', 500);
  }
}

// 使用优惠券（下单时）
async function useCoupon(req, res) {
  try {
    const userId = req.user.userId;
    const { user_coupon_id, order_id, order_amount } = req.body;

    if (!user_coupon_id || !order_id) {
      return sendError(res, '参数不完整', 400);
    }

    // 检查优惠券
    const [userCoupons] = await mysqlPool.execute(
      'SELECT uc.*, c.type, c.condition_amount, c.discount_amount, c.min_order_amount FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 1',
      [user_coupon_id, userId]
    );

    if (userCoupons.length === 0) {
      return sendError(res, '优惠券不可用', 400);
    }

    const coupon = userCoupons[0];

    // 检查使用条件
    if (order_amount < coupon.min_order_amount) {
      return sendError(res, `订单金额需满${coupon.min_order_amount}元`, 400);
    }

    // 标记为已使用
    await mysqlPool.execute(
      'UPDATE user_coupons SET status = 2, order_id = ?, used_at = NOW() WHERE id = ?',
      [order_id, user_coupon_id]
    );

    // 计算优惠金额
    let discount = 0;
    if (coupon.type === 1) {
      // 满减
      discount = coupon.discount_amount;
    } else if (coupon.type === 2) {
      // 折扣
      discount = Math.round(order_amount * (1 - coupon.discount_amount / 10));
    } else {
      // 无门槛
      discount = coupon.discount_amount;
    }

    sendRes(res, { discount }, '优惠券使用成功');
  } catch (err) {
    sendError(res, '使用优惠券失败', 500);
  }
}

module.exports = {
  getCouponList,
  receiveCoupon,
  getUserCoupons,
  useCoupon,
};

