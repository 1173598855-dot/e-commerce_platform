const { mysqlPool } = require("../config/database");
const { sendRes, sendError } = require("../utils/response.util");

async function getRecommendations(req, res) {
  try {
    const userId = parseInt(req.user.userId);
    const limit = parseInt(req.query.limit) || 20;

    const [favCats] = await mysqlPool.execute(
      "SELECT p.category_id, COUNT(*) as cnt FROM favorites f JOIN products p ON f.product_id = p.id WHERE f.user_id = ? GROUP BY p.category_id ORDER BY cnt DESC LIMIT 3",
      [userId]
    );

    const [buyCats] = await mysqlPool.execute(
      "SELECT oi.product_id FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.user_id = ? AND o.status = ? GROUP BY oi.product_id ORDER BY MAX(o.created_at) DESC LIMIT 10",
      [userId, "completed"]
    );

    const catWeights = {};
    favCats.forEach(c => { catWeights[parseInt(c.category_id)] = (catWeights[parseInt(c.category_id)] || 0) + parseInt(c.cnt) * 2; });

    if (buyCats.length > 0) {
      const productIds = buyCats.map(b => parseInt(b.product_id));
      const [prodDetails] = await mysqlPool.execute(
        "SELECT id, category_id FROM products WHERE id IN (" + productIds.join(",") + ")"
      );
      const pm = {};
      prodDetails.forEach(p => { pm[parseInt(p.id)] = parseInt(p.category_id); });
      buyCats.forEach(b => {
        const catId = pm[parseInt(b.product_id)];
        if (catId) catWeights[catId] = (catWeights[catId] || 0) + 3;
      });
    }

    const topCats = Object.keys(catWeights).sort((a, b) => catWeights[b] - catWeights[a]).slice(0, 3).map(Number);

    const [viewed] = await mysqlPool.execute(
      "SELECT target_id FROM user_behavior_logs WHERE user_id = ? AND action = ? ORDER BY created_at DESC LIMIT 50",
      [userId, "view"]
    );
    const viewedIds = viewed.map(v => parseInt(v.target_id));

    let whereClause = "p.status = 1";
    const params = [];

    if (topCats.length > 0) {
      whereClause += " AND p.category_id IN (" + topCats.map(() => "?").join(",") + ")";
      params.push(...topCats);
    }

    if (viewedIds.length > 0) {
      whereClause += " AND p.id NOT IN (" + viewedIds.map(() => "?").join(",") + ")";
      params.push(...viewedIds);
    }

    const [products] = await mysqlPool.execute(
      "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE " + whereClause + " ORDER BY p.sales DESC, p.created_at DESC LIMIT ?",
      [...params, limit]
    );

    sendRes(res, products);
  } catch (err) {
    console.error("getRecommendations error:", err);
    sendError(res, "获取推荐失败", 500);
  }
}

async function recordBehavior(req, res) {
  try {
    const userId = parseInt(req.user.userId);
    const { action, target_type, target_id, duration, extra_data } = req.body;
    if (!action || !target_type || !target_id) return sendError(res, "行为数据不完整", 400);
    await mysqlPool.execute(
      "INSERT INTO user_behavior_logs (user_id, action, target_type, target_id, duration, extra_data) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, action, target_type, parseInt(target_id), duration || 0, extra_data ? JSON.stringify(extra_data) : null]
    );
    sendRes(res, null, "行为记录成功");
  } catch (err) {
    console.error("recordBehavior error:", err);
    sendError(res, "记录行为失败", 500);
  }
}

module.exports = { getRecommendations, recordBehavior };
