const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

// 获取数据概览
async function getDataOverview(req, res) {
  try {
    // 用户统计
    const [[userCount]] = await mysqlPool.execute('SELECT COUNT(*) as count FROM users');
    
    // 商品统计
    const [[productCount]] = await mysqlPool.execute('SELECT COUNT(*) as count FROM products WHERE status = 1');
    
    // 订单统计
    const [[orderCount]] = await mysqlPool.execute('SELECT COUNT(*) as count FROM orders');
    const [[orderAmount]] = await mysqlPool.execute('SELECT SUM(total_amount) as total FROM orders WHERE status IN (?, ?)', ['paid', 'completed']);
    
    // 今日订单
    const today = new Date().toISOString().split('T')[0];
    const [[todayOrders]] = await mysqlPool.execute(
      'SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders WHERE DATE(created_at) = ?',
      [today]
    );

    sendRes(res, {
      users: userCount.count,
      products: productCount.count,
      totalOrders: orderCount.count,
      totalAmount: orderAmount.total || 0,
      todayOrders: todayOrders.count || 0,
      todayAmount: todayOrders.total || 0,
    });
  } catch (err) {
    sendError(res, '获取数据失败', 500);
  }
}

// 获取销售趋势
async function getSalesTrend(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;

    const [trend] = await mysqlPool.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total_amount) as amount
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [days]);

    sendRes(res, trend);
  } catch (err) {
    sendError(res, '获取销售趋势失败', 500);
  }
}

// 获取商品销量排行
async function getProductRanking(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const [ranking] = await mysqlPool.execute(`
      SELECT p.id, p.name, p.image, SUM(oi.quantity) as total_sold, SUM(oi.subtotal) as total_amount
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status IN (?, ?)
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT ?
    `, ['paid', 'completed', limit]);

    sendRes(res, ranking);
  } catch (err) {
    sendError(res, '获取排行失败', 500);
  }
}

// 获取用户活跃度
async function getUserActivity(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;

    const [activity] = await mysqlPool.execute(`
      SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as active_users
      FROM user_behavior_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [days]);

    sendRes(res, activity);
  } catch (err) {
    sendError(res, '获取活跃度失败', 500);
  }
}

module.exports = { getDataOverview, getSalesTrend, getProductRanking, getUserActivity };
