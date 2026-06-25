const { mysqlPool } = require("../config/database");
const { sendRes, sendError } = require("../utils/response.util");

async function saveSearchHistory(req, res) {
  try {
    const userId = req.user.userId;
    const { keyword } = req.body;
    if (!keyword) return sendError(res, "搜索关键词不能为空", 400);
    await mysqlPool.execute("DELETE FROM search_histories WHERE user_id = ? AND keyword = ?", [userId, keyword]);
    await mysqlPool.execute("INSERT INTO search_histories (user_id, keyword) VALUES (?, ?)", [userId, keyword]);
    sendRes(res, null, "搜索记录已保存");
  } catch (err) {
    console.error("saveSearchHistory error:", err);
    sendError(res, "保存搜索历史失败", 500);
  }
}

async function getSearchHistory(req, res) {
  try {
    const userId = req.user.userId;
    const [histories] = await mysqlPool.execute(
      "SELECT keyword FROM search_histories WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
      [userId]
    );
    sendRes(res, histories.map(h => h.keyword));
  } catch (err) {
    console.error("getSearchHistory error:", err);
    sendError(res, "获取搜索历史失败", 500);
  }
}

async function clearSearchHistory(req, res) {
  try {
    const userId = req.user.userId;
    await mysqlPool.execute("DELETE FROM search_histories WHERE user_id = ?", [userId]);
    sendRes(res, null, "搜索历史已清空");
  } catch (err) {
    console.error("clearSearchHistory error:", err);
    sendError(res, "清空失败", 500);
  }
}

async function getHotSearches(req, res) {
  try {
    const [hots] = await mysqlPool.execute(
      "SELECT keyword FROM hot_searches WHERE is_hot = 1 ORDER BY search_count DESC LIMIT 10"
    );
    if (hots.length === 0) {
      const [cats] = await mysqlPool.execute(
        "SELECT name FROM categories WHERE status = 1 ORDER BY sort_order LIMIT 10"
      );
      sendRes(res, cats.map(c => c.name));
    } else {
      sendRes(res, hots.map(h => h.keyword));
    }
  } catch (err) {
    console.error("getHotSearches error:", err);
    sendError(res, "获取热搜词失败", 500);
  }
}

async function getSearchSuggestions(req, res) {
  try {
    const { keyword } = req.query;
    if (!keyword || keyword.length < 1) return sendError(res, "请输入搜索关键词", 400);
    const [products] = await mysqlPool.execute(
      "SELECT DISTINCT name FROM products WHERE status = 1 AND name LIKE ? LIMIT 10",
      ["%" + keyword + "%"]
    );
    const [categories] = await mysqlPool.execute(
      "SELECT DISTINCT name FROM categories WHERE status = 1 AND name LIKE ? LIMIT 5",
      ["%" + keyword + "%"]
    );
    const suggestions = [
      ...products.map(p => ({ type: "product", text: p.name })),
      ...categories.map(c => ({ type: "category", text: c.name })),
    ];
    sendRes(res, suggestions.slice(0, 15));
  } catch (err) {
    console.error("getSearchSuggestions error:", err);
    sendError(res, "获取联想词失败", 500);
  }
}

async function recordSearchBehavior(req, res) {
  try {
    const userId = req.user.userId;
    const { keyword } = req.body;
    if (keyword) {
      await mysqlPool.execute("INSERT INTO search_histories (user_id, keyword) VALUES (?, ?)", [userId, keyword]);
      await mysqlPool.execute(
        "INSERT INTO hot_searches (keyword, search_count) VALUES (?, 1) ON DUPLICATE KEY UPDATE search_count = search_count + 1",
        [keyword]
      );
    }
    sendRes(res, null, "行为记录成功");
  } catch (err) {
    console.error("recordSearchBehavior error:", err);
    sendError(res, "记录失败", 500);
  }
}

module.exports = { saveSearchHistory, getSearchHistory, clearSearchHistory, getHotSearches, getSearchSuggestions, recordSearchBehavior };
