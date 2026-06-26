const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

// 获取商品评价列表
async function getReviews(req, res) {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const withImages = req.query.withImages === 'true';
    const rating = req.query.rating || null;

    const offset = (page - 1) * pageSize;
    let whereClauses = ['product_id = ?'];
    let params = [id];

    if (withImages) {
      whereClauses.push('JSON_LENGTH(images) > 0');
    }
    if (rating) {
      whereClauses.push('rating = ?');
      params.push(rating);
    }

    const whereSql = whereClauses.join(' AND ');

    const [reviews] = await mysqlPool.execute(
      `SELECT r.*, u.nickname, u.avatar 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE ${whereSql} 
       ORDER BY r.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const [[{ count }]] = await mysqlPool.execute(
      `SELECT COUNT(*) as count FROM reviews WHERE ${whereSql}`,
      params
    );

    // 计算平均评分和全量评分分布
    const [[avg]] = await mysqlPool.execute(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE product_id = ?',
      [id]
    );

    const [ratingRows] = await mysqlPool.execute(
      'SELECT rating, COUNT(*) as cnt FROM reviews WHERE product_id = ? GROUP BY rating',
      [id]
    );
    const dist = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    ratingRows.forEach(row => { dist[String(row.rating)] = row.cnt; });

    sendRes(res, {
      list: reviews,
      averageRating: parseFloat(avg.avg_rating || 0).toFixed(1),
      totalReviews: count,
      ratingDistribution: dist,
      pagination: { page, pageSize, total: count },
    });
  } catch (err) {
    sendError(res, '获取评价失败', 500);
  }
}

// 提交评价
async function createReview(req, res) {
  try {
    const userId = req.user.userId;
    const { product_id, order_id, rating, content, images } = req.body;

    if (!product_id || !rating) {
      return sendError(res, '商品ID和评分不能为空', 400);
    }

    if (rating < 1 || rating > 5) {
      return sendError(res, '评分必须在1-5之间', 400);
    }

    if (order_id) {
      const [orderCheck] = await mysqlPool.execute(
        'SELECT id FROM orders WHERE id = ? AND user_id = ?',
        [order_id, userId]
      );
      if (orderCheck.length === 0) {
        return sendError(res, '关联订单不存在', 400);
      }
    }

    const result = await mysqlPool.execute(
      'INSERT INTO reviews (user_id, product_id, order_id, rating, content, images) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, product_id, order_id || null, rating, content || '', JSON.stringify(images || [])]
    );

    sendRes(res, { id: result.insertId }, '评价提交成功');
  } catch (err) {
    console.error('提交评价错误:', err);
    sendError(res, '提交评价失败', 500);
  }
}

// 获取用户评价列表
async function getMyReviews(req, res) {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const [reviews] = await mysqlPool.execute(
      `SELECT r.*, p.name as product_name, p.image as product_image, o.order_no
       FROM reviews r
       LEFT JOIN products p ON r.product_id = p.id
       LEFT JOIN orders o ON r.order_id = o.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    const [[{ count }]] = await mysqlPool.execute(
      'SELECT COUNT(*) as count FROM reviews WHERE user_id = ?',
      [userId]
    );

    sendRes(res, {
      list: reviews,
      pagination: { page, pageSize, total: count },
    });
  } catch (err) {
    sendError(res, '获取评价列表失败', 500);
  }
}

module.exports = {
  getReviews,
  createReview,
  getMyReviews,
};
