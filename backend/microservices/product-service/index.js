const express = require("express");
require("dotenv").config();
const mysql = require("mysql2/promise");
const { sendRes, sendError, authMiddleware } = require("./shared");

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3314,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "ecommerce"
});

app.get("/health", (req, res) => sendRes(res, { service: "product-service", status: "running" }, "OK"));

// ==================== 商品 ====================
app.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const keyword = req.query.keyword || "";
    const categoryId = req.query.categoryId || "";
    let where = "p.status = 1";
    const params = [];
    if (keyword) { where += " AND (p.name LIKE ? OR p.description LIKE ?)"; params.push("%" + keyword + "%", "%" + keyword + "%"); }
    if (categoryId) { where += " AND p.category_id = ?"; params.push(categoryId); }
    const [products] = await pool.query(
      "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE " + where + " ORDER BY p.created_at DESC LIMIT ? OFFSET ?",
      [...params, Number(pageSize), Number(offset)]
    );
    const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM products p WHERE " + where, params);
    sendRes(res, { list: products, pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) } });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/hot", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const [products] = await pool.query(
      "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 1 ORDER BY p.sales DESC LIMIT ?", [Number(limit)]
    );
    sendRes(res, { list: products });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/:id", async (req, res) => {
  try {
    const [products] = await pool.query(
      "SELECT p.*, c.name as category_name, m.name as merchant_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN merchants m ON p.merchant_id = m.id WHERE p.id = ? AND p.status = 1",
      [req.params.id]
    );
    if (products.length === 0) return sendError(res, "Not found", 404);
    const product = products[0];
    const [skus] = await pool.query("SELECT * FROM product_skus WHERE product_id = ? AND status = 1", [req.params.id]);
    product.skus = skus;
    const [images] = await pool.query("SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order", [req.params.id]);
    product.images = images.map(i => i.image_url);
    const [[avg]] = await pool.query("SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE product_id = ?", [req.params.id]);
    product.avg_rating = avg.avg_rating ? parseFloat(avg.avg_rating).toFixed(1) : 0;
    product.review_count = avg.total;
    sendRes(res, product);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

// ==================== 分类 ====================
app.get("/categories", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categories WHERE status = 1 ORDER BY sort_order, id");
    sendRes(res, rows);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/categories/all", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categories WHERE status = 1 ORDER BY sort_order, id");
    sendRes(res, rows);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/categories/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categories WHERE id = ? AND status = 1", [req.params.id]);
    if (rows.length === 0) return sendError(res, "Not found", 404);
    sendRes(res, rows[0]);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

// ==================== 评价 ====================
app.get("/reviews/product/:id", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const rating = req.query.rating || "";
    let where = "r.product_id = ?";
    const params = [req.params.id];
    if (rating) { where += " AND r.rating = ?"; params.push(rating); }
    const [reviews] = await pool.query(
      "SELECT r.*, u.nickname, u.avatar FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE " + where + " ORDER BY r.created_at DESC LIMIT ? OFFSET ?",
      [...params, Number(pageSize), Number(offset)]
    );
    const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM reviews r WHERE " + where, params);
    const [[avg]] = await pool.query("SELECT AVG(rating) as avg_rating FROM reviews WHERE product_id = ?", [req.params.id]);
    const [dist] = await pool.query("SELECT rating, COUNT(*) as cnt FROM reviews WHERE product_id = ? GROUP BY rating", [req.params.id]);
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    dist.forEach(d => { ratingDist[d.rating] = d.cnt; });
    sendRes(res, { list: reviews, averageRating: avg.avg_rating ? parseFloat(avg.avg_rating).toFixed(1) : "0.0", totalReviews: count, ratingDistribution: ratingDist, pagination: { page, pageSize, total: count } });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.post("/reviews", authMiddleware, async (req, res) => {
  try {
    const { product_id, order_id, rating, content, images } = req.body;
    if (!product_id || !rating) return sendError(res, "product_id and rating required", 400);
    if (rating < 1 || rating > 5) return sendError(res, "rating 1-5", 400);
    const [result] = await pool.query(
      "INSERT INTO reviews (user_id, product_id, order_id, rating, content, images) VALUES (?, ?, ?, ?, ?, ?)",
      [req.user.userId, product_id, order_id || null, rating, content || "", JSON.stringify(images || [])]
    );
    sendRes(res, { id: result.insertId }, "Review submitted");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/reviews/my", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const [reviews] = await pool.query(
      "SELECT r.*, p.name as product_name, p.image as product_image FROM reviews r LEFT JOIN products p ON r.product_id = p.id WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?",
      [req.user.userId, pageSize, offset]
    );
    const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM reviews WHERE user_id = ?", [req.user.userId]);
    sendRes(res, { list: reviews, pagination: { page, pageSize, total: count } });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

// ==================== SKU ====================
app.get("/skus/:productId/options", async (req, res) => {
  try {
    const [options] = await pool.query("SELECT * FROM product_spec_options WHERE product_id = ? ORDER BY sort_order", [req.params.productId]);
    const specMap = {};
    options.forEach(opt => { if (!specMap[opt.spec_name]) specMap[opt.spec_name] = []; specMap[opt.spec_name].push(opt.spec_value); });
    sendRes(res, specMap);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/skus/:productId/list", async (req, res) => {
  try {
    const [skus] = await pool.query("SELECT * FROM product_skus WHERE product_id = ? AND status = 1 ORDER BY price", [req.params.productId]);
    sendRes(res, skus);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.post("/skus/:productId/find", async (req, res) => {
  try {
    const { specs } = req.body;
    if (!specs || Object.keys(specs).length === 0) return sendError(res, "specs required", 400);
    const conditions = [];
    const params = [req.params.productId];
    for (const [name, value] of Object.entries(specs)) {
      conditions.push("(product_id = ? AND spec_name = ? AND spec_value = ?)");
      params.push(req.params.productId, name, value);
    }
    const [options] = await pool.query("SELECT DISTINCT product_id FROM product_spec_options WHERE " + conditions.join(" OR "), params);
    if (options.length === 0) return sendError(res, "Not found", 404);
    const [skus] = await pool.query("SELECT * FROM product_skus WHERE product_id = ? AND status = 1", [req.params.productId]);
    sendRes(res, skus[0] || null);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

const PORT = process.env.PRODUCT_SERVICE_PORT || 4002;
app.listen(PORT, async () => {
  console.log("Product service on port " + PORT);
  try { await pool.getConnection(); console.log("MySQL OK"); } catch(e) { console.warn("MySQL:", e.message); }
});

module.exports = app;
