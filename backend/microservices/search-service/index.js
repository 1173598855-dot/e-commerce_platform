const express = require("express");
require("dotenv").config();
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3314,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "ecommerce"
});

function sendRes(res, data, msg) { res.json({ success: true, data: data || null, message: msg || "success", timestamp: Date.now() }); }
function sendError(res, msg, code) { res.status(code || 400).json({ success: false, message: msg, timestamp: Date.now() }); }

function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return sendError(res, "No token", 401);
  try { req.user = jwt.verify(token, process.env.JWT_SECRET || "ecommerce_jwt_secret_key_2024"); next(); }
  catch (err) { sendError(res, "Invalid token", 401); }
}

app.get("/health", (req, res) => sendRes(res, { service: "search-service", status: "running" }, "OK"));

app.get("/", async (req, res) => {
  try {
    const keyword = req.query.keyword || "";
    const categoryId = req.query.categoryId || "";
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    if (!keyword.trim()) return sendError(res, "Keyword required", 400);
    let whereClause = "status = 1 AND (name LIKE ? OR description LIKE ?)";
    const params = ["%" + keyword + "%", "%" + keyword + "%"];
    if (categoryId) { whereClause += " AND category_id = ?"; params.push(categoryId); }
    const [products] = await pool.execute(
      "SELECT * FROM products WHERE " + whereClause + " ORDER BY sales DESC LIMIT ? OFFSET ?",
      [...params, pageSize, offset]
    );
    const [[{ count }]] = await pool.execute("SELECT COUNT(*) as count FROM products WHERE " + whereClause, params);
    sendRes(res, { list: products, pagination: { page, pageSize, total: count }, keyword }, "Search OK");
  } catch (err) { console.error(err); sendError(res, "Search failed", 500); }
});

app.get("/suggestions", async (req, res) => {
  try {
    const keyword = req.query.keyword || "";
    if (!keyword.trim()) return sendError(res, "Keyword required", 400);
    const [sugs] = await pool.execute("SELECT DISTINCT name FROM products WHERE status=1 AND (name LIKE ? OR description LIKE ?) LIMIT 10",
      ["%" + keyword + "%", "%" + keyword + "%"]);
    sendRes(res, sugs.map(s => s.name), "OK");
  } catch (err) { console.error(err); sendError(res, "Failed", 500); }
});

app.get("/hot", async (req, res) => {
  try {
    const [hots] = await pool.execute("SELECT keyword, search_count FROM hot_searches ORDER BY search_count DESC LIMIT 10");
    sendRes(res, hots, "OK");
  } catch (err) { console.error(err); sendError(res, "Failed", 500); }
});

app.post("/history", authMiddleware, async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return sendError(res, "Keyword required", 400);
    await pool.execute("INSERT INTO search_histories (user_id, keyword, source, created_at) VALUES (?, ?, 'app', NOW())", [req.user.userId, keyword]);
    await pool.execute("INSERT INTO hot_searches (keyword, search_count, is_hot, created_at) VALUES (?, 1, 0, NOW()) ON DUPLICATE KEY UPDATE search_count = search_count + 1", [keyword]);
    sendRes(res, null, "History saved");
  } catch (err) { console.error(err); sendError(res, "Save failed", 500); }
});

app.get("/history", authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const [history] = await pool.execute("SELECT keyword, created_at FROM search_histories WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", [req.user.userId, limit]);
    sendRes(res, history, "OK");
  } catch (err) { console.error(err); sendError(res, "Failed", 500); }
});

app.delete("/history", authMiddleware, async (req, res) => {
  try {
    await pool.execute("DELETE FROM search_histories WHERE user_id = ?", [req.user.userId]);
    sendRes(res, null, "Cleared");
  } catch (err) { console.error(err); sendError(res, "Failed", 500); }
});

const PORT = process.env.SEARCH_SERVICE_PORT || 4005;
app.listen(PORT, async () => {
  console.log("Search service on port " + PORT);
  try { await pool.getConnection(); console.log("MySQL OK"); } catch(e) { console.warn("MySQL:", e.message); }
});

module.exports = app;