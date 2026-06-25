const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

// 收藏商品
async function favoriteProduct(req, res) {
  try {
    const userId = req.user.userId;
    const { product_id } = req.body;

    if (!product_id) {
      return sendError(res, '商品ID不能为空', 400);
    }

    await mysqlPool.execute(
      'INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)',
      [userId, product_id]
    );

    sendRes(res, null, '已收藏');
  } catch (err) {
    sendError(res, '收藏失败', 500);
  }
}

// 取消收藏
async function unfavoriteProduct(req, res) {
  try {
    const userId = req.user.userId;
    const { product_id } = req.body;

    await mysqlPool.execute(
      'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );

    sendRes(res, null, '已取消收藏');
  } catch (err) {
    sendError(res, '取消收藏失败', 500);
  }
}

// 获取收藏列表
async function getFavorites(req, res) {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const [favorites] = await mysqlPool.execute(
      `SELECT f.*, p.name, p.price, p.image, p.sales, c.name as category_name
       FROM favorites f
       JOIN products p ON f.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    const [[{ count }]] = await mysqlPool.execute(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = ?',
      [userId]
    );

    sendRes(res, {
      list: favorites,
      pagination: { page, pageSize, total: count },
    });
  } catch (err) {
    sendError(res, '获取收藏失败', 500);
  }
}

// 检查是否已收藏
async function checkFavorite(req, res) {
  try {
    const userId = req.user.userId;
    const { product_id } = req.params;

    const [rows] = await mysqlPool.execute(
      'SELECT id FROM favorites WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );

    sendRes(res, { isFavorite: rows.length > 0 });
  } catch (err) {
    sendError(res, '查询失败', 500);
  }
}

module.exports = {
  favoriteProduct,
  unfavoriteProduct,
  getFavorites,
  checkFavorite,
};
