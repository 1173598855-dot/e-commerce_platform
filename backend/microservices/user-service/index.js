const express = require("express");
require("dotenv").config();
const mysql = require("mysql2/promise");
const { sendRes, sendError, authMiddleware, generateToken } = require("./shared");

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3314,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "ecommerce"
});

app.get("/health", (req, res) => sendRes(res, { service: "user-service", status: "running" }, "OK"));

// ==================== 地址 ====================
app.get("/addresses", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM addresses WHERE user_id = ? AND status = 1 ORDER BY is_default DESC, created_at DESC", [req.user.userId]);
    sendRes(res, rows);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.post("/addresses", authMiddleware, async (req, res) => {
  try {
    const { receiver_name, receiver_phone, province, city, district, detail_address, is_default } = req.body;
    if (!receiver_name || !receiver_phone || !province || !city || !district || !detail_address) return sendError(res, "请填写完整地址", 400);
    if (is_default) await pool.query("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [req.user.userId]);
    const [r] = await pool.query(
      "INSERT INTO addresses (user_id, receiver_name, receiver_phone, province, city, district, detail_address, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [req.user.userId, receiver_name, receiver_phone, province, city, district, detail_address, is_default ? 1 : 0]
    );
    sendRes(res, { id: r.insertId }, "Added");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.put("/addresses/:id", authMiddleware, async (req, res) => {
  try {
    const fields = []; const params = [];
    ["receiver_name", "receiver_phone", "province", "city", "district", "detail_address", "is_default"].forEach((f) => {
      if (req.body[f] !== undefined) { fields.push(f + " = ?"); params.push(req.body[f]); }
    });
    if (fields.length === 0) return sendError(res, "Nothing to update", 400);
    params.push(req.params.id, req.user.userId);
    await pool.query("UPDATE addresses SET " + fields.join(", ") + " WHERE id = ? AND user_id = ?", params);
    sendRes(res, null, "Updated");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.delete("/addresses/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query("UPDATE addresses SET status = 0 WHERE id = ? AND user_id = ?", [req.params.id, req.user.userId]);
    sendRes(res, null, "Deleted");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/addresses/default", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM addresses WHERE user_id = ? AND is_default = 1 AND status = 1 LIMIT 1", [req.user.userId]);
    sendRes(res, rows[0] || null);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

// ==================== 收藏 ====================
app.post("/favorites", authMiddleware, async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) return sendError(res, "product_id required", 400);
    await pool.query("INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)", [req.user.userId, product_id]);
    sendRes(res, null, "Favorited");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.delete("/favorites", authMiddleware, async (req, res) => {
  try {
    const { product_id } = req.body;
    await pool.query("DELETE FROM favorites WHERE user_id = ? AND product_id = ?", [req.user.userId, product_id]);
    sendRes(res, null, "Unfavorited");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/favorites", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      "SELECT f.*, p.name, p.price, p.image, p.sales FROM favorites f JOIN products p ON f.product_id = p.id WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?",
      [req.user.userId, pageSize, offset]
    );
    const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM favorites WHERE user_id = ?", [req.user.userId]);
    sendRes(res, { list: rows, pagination: { page, pageSize, total: count } });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/favorites/:product_id/status", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id FROM favorites WHERE user_id = ? AND product_id = ?", [req.user.userId, req.params.product_id]);
    sendRes(res, { isFavorite: rows.length > 0 });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

// ==================== 优惠券 ====================
app.get("/coupons", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT *, CASE WHEN type = 1 THEN CONCAT('满', condition_amount, '减', discount_amount) WHEN type = 2 THEN CONCAT(discount_amount, '折') ELSE CONCAT('立减', discount_amount) END as display_text FROM coupons WHERE status = 1 AND valid_start <= NOW() AND valid_end >= NOW() AND issued_count < total_count ORDER BY discount_amount DESC"
    );
    sendRes(res, rows);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.post("/coupons/receive", authMiddleware, async (req, res) => {
  try {
    const { coupon_id } = req.body;
    if (!coupon_id) return sendError(res, "coupon_id required", 400);
    const [coupons] = await pool.query("SELECT * FROM coupons WHERE id = ? AND status = 1", [coupon_id]);
    if (coupons.length === 0) return sendError(res, "Not found", 404);
    const [owned] = await pool.query("SELECT COUNT(*) as c FROM user_coupons WHERE user_id = ? AND coupon_id = ? AND status = 1", [req.user.userId, coupon_id]);
    if (coupons[0].per_user_limit > 0 && owned[0].c >= coupons[0].per_user_limit) return sendError(res, "Already received", 400);
    await pool.query("INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)", [req.user.userId, coupon_id, coupons[0].valid_end]);
    await pool.query("UPDATE coupons SET issued_count = issued_count + 1 WHERE id = ?", [coupon_id]);
    sendRes(res, null, "Received");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/coupons/my", authMiddleware, async (req, res) => {
  try {
    const status = req.query.status || "all";
    let where = "uc.user_id = ?";
    const params = [req.user.userId];
    if (status === "available") { where += " AND uc.status = 1 AND uc.expires_at > NOW()"; }
    else if (status === "used") { where += " AND uc.status = 2"; }
    else if (status === "expired") { where += " AND (uc.status = 3 OR uc.expires_at <= NOW())"; }
    const [rows] = await pool.query(
      "SELECT uc.*, c.name, c.type, c.discount_amount FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE " + where + " ORDER BY uc.expires_at ASC", params
    );
    sendRes(res, rows);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

// ==================== 积分 ====================
app.get("/points", authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query("SELECT points FROM users WHERE id = ?", [req.user.userId]);
    sendRes(res, { points: users[0] ? users[0].points : 0 });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.post("/points/add", authMiddleware, async (req, res) => {
  try {
    const { points, type, description, relatedId } = req.body;
    if (!points || !type) return sendError(res, "points and type required", 400);
    await pool.query("UPDATE users SET points = points + ? WHERE id = ?", [points, req.user.userId]);
    await pool.query("INSERT INTO points_logs (user_id, points, type, description, related_id) VALUES (?, ?, ?, ?, ?)", [req.user.userId, points, type, description || "", relatedId || null]);
    const [u] = await pool.query("SELECT points FROM users WHERE id = ?", [req.user.userId]);
    sendRes(res, { points: u[0].points }, "Points added");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.post("/points/consume", authMiddleware, async (req, res) => {
  try {
    const { points, type, relatedId } = req.body;
    if (!points || points <= 0) return sendError(res, "points > 0 required", 400);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [users] = await conn.execute("SELECT points FROM users WHERE id = ? FOR UPDATE", [req.user.userId]);
      if (users.length === 0) { await conn.rollback(); return sendError(res, "User not found", 404); }
      if (users[0].points < points) { await conn.rollback(); return sendError(res, "Insufficient points", 400); }
      await conn.execute("UPDATE users SET points = points - ? WHERE id = ?", [points, req.user.userId]);
      await conn.execute("INSERT INTO points_logs (user_id, points, type, related_id) VALUES (?, ?, ?, ?)", [req.user.userId, -points, type || "consume", relatedId || null]);
      await conn.commit();
      const [u] = await pool.query("SELECT points FROM users WHERE id = ?", [req.user.userId]);
      sendRes(res, { points: u[0].points }, "Points consumed");
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/points/logs", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query("SELECT * FROM points_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?", [req.user.userId, pageSize, offset]);
    const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM points_logs WHERE user_id = ?", [req.user.userId]);
    sendRes(res, { list: rows, pagination: { page, pageSize, total: count } });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

// ==================== 商家 ====================
app.post("/merchants/apply", authMiddleware, async (req, res) => {
  try {
    const { name, contact_name, contact_phone, business_license, description, address } = req.body;
    if (!name || !contact_name || !contact_phone) return sendError(res, "Name and contact required", 400);
    const [r] = await pool.query("INSERT INTO merchants (name, contact_name, contact_phone, business_license, description, address, status) VALUES (?, ?, ?, ?, ?, ?, 0)", [name, contact_name, contact_phone, business_license || "", description || "", address || ""]);
    sendRes(res, { id: r.insertId }, "Applied");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/merchants/info", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM merchants WHERE id = ?", [req.user.merchantId || 0]);
    sendRes(res, rows[0] || null);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/merchants/products", authMiddleware, async (req, res) => {
  try {
    const merchantId = req.user.merchantId;
    if (!merchantId) return sendError(res, "Not a merchant", 400);
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query("SELECT * FROM products WHERE merchant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?", [merchantId, pageSize, offset]);
    const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM products WHERE merchant_id = ?", [merchantId]);
    sendRes(res, { list: rows, pagination: { page, pageSize, total: count } });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

const PORT = process.env.USER_SERVICE_PORT || 4001;
app.listen(PORT, async () => {
  console.log("User service on port " + PORT);
  try { await pool.getConnection(); console.log("MySQL OK"); } catch(e) { console.warn("MySQL:", e.message); }
});

module.exports = app;