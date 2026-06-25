const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

// 模拟支付
async function mockPayment(req, res) {
  try {
    const { orderId, paymentMethod = 'alipay' } = req.body;
    const userId = req.user.userId;

    if (!orderId) {
      return sendError(res, '订单ID不能为空', 400);
    }

    // 查询订单
    const [orders] = await mysqlPool.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ? AND status IN (?, ?)',
      [orderId, userId, 'pending', 'paid']
    );

    if (orders.length === 0) {
      return sendError(res, '订单不存在或状态不正确', 404);
    }

    const order = orders[0];

    // 模拟支付处理（延迟）
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 更新订单状态
    await mysqlPool.execute(
      'UPDATE orders SET status = ?, payment_method = ?, paid_at = NOW() WHERE id = ?',
      ['paid', paymentMethod, orderId]
    );

    sendRes(res, {
      orderId,
      amount: order.total_amount,
      paymentMethod,
      transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
      status: 'paid',
    }, '支付成功');
  } catch (err) {
    console.error('支付错误:', err);
    sendError(res, '支付失败', 500);
  }
}

// 查询订单支付状态
async function getPaymentStatus(req, res) {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const [orders] = await mysqlPool.execute(
      'SELECT id, order_no, total_amount, status, payment_method, paid_at FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );

    if (orders.length === 0) {
      return sendError(res, '订单不存在', 404);
    }

    sendRes(res, orders[0]);
  } catch (err) {
    sendError(res, '查询失败', 500);
  }
}

// 获取支付记录
async function getPaymentHistory(req, res) {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const [records] = await mysqlPool.execute(
      `SELECT o.id, o.order_no, o.total_amount, o.status, o.payment_method, o.paid_at, o.created_at
       FROM orders o
       WHERE o.user_id = ? AND o.status != 'pending'
       ORDER BY o.paid_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    const [[{ count }]] = await mysqlPool.execute(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status != ?',
      [userId, 'pending']
    );

    sendRes(res, {
      list: records,
      pagination: { page, pageSize, total: count },
    });
  } catch (err) {
    sendError(res, '获取支付记录失败', 500);
  }
}

module.exports = {
  mockPayment,
  getPaymentStatus,
  getPaymentHistory,
};
