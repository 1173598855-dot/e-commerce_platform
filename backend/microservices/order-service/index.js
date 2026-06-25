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

app.get("/health", (req, res) => sendRes(res, { service: "order-service", status: "running" }, "OK"));

app.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const status = req.query.status || "";
    let whereClause = "user_id = ?";
    const params = [userId];
    if (status) { whereClause += " AND status = ?"; params.push(status); }
    const [orders] = await pool.execute(
      "SELECT * FROM orders WHERE " + whereClause + " ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [...params, pageSize, offset]
    );
    const [[{ count }]] = await pool.execute("SELECT COUNT(*) as count FROM orders WHERE " + whereClause, params);
    sendRes(res, { list: orders, pagination: { page, pageSize, total: count } }, "OK");
  } catch (err) { console.error(err); sendError(res, "Failed: " + err.message, 500); }
});

app.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { items, shipping_address, remark } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return sendError(res, "Items required", 400);
    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      const [prods] = await pool.execute("SELECT price, stock FROM products WHERE id = ? AND status = 1", [item.product_id]);
      if (prods.length === 0) return sendError(res, "Product not found: " + item.product_id, 404);
      if (prods[0].stock < item.quantity) return sendError(res, "Insufficient stock", 400);
      const itemTotal = prods[0].price * item.quantity;
      totalAmount += itemTotal;
      orderItems.push({ product_id: item.product_id, quantity: item.quantity, price: prods[0].price, subtotal: itemTotal });
    }
    const orderNo = "ORD" + Date.now() + Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      console.log("INSERT params:", JSON.stringify([orderNo, userId, totalAmount, shipping_address ? JSON.stringify(shipping_address) : null, remark || null])); const oR = await conn.query(
        "INSERT INTO orders (order_no, user_id, total_amount, status, shipping_address, remark, created_at) VALUES (?, ?, ?, 'pending', ?, ?, NOW())",
        [orderNo, userId, totalAmount, shipping_address ? JSON.stringify(shipping_address) : null, remark || null]
      );
      console.log("oR type:", typeof oR, "oR:", JSON.stringify(oR)); const orderId = oR[0] ? oR[0].insertId : oR.insertId; console.log("orderId:", orderId);
      for (const item of orderItems) {
        await conn.query("INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)",
          [orderId, item.product_id, item.quantity, item.price, item.subtotal]);
        await conn.query("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.product_id]);
      }
      await conn.commit();
      sendRes(res, { orderId, orderNo, totalAmount }, "Order created");
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  } catch (err) { console.error(err); sendError(res, "Create failed: " + err.message + " | stack: " + (err.stack || "").split("\n")[1], 500); }
});

app.put("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const [orders] = await pool.execute("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'pending'", [req.params.id, req.user.userId]);
    if (orders.length === 0) return sendError(res, "Order not found or wrong status", 400);
    await pool.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    const [items] = await pool.execute("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [req.params.id]);
    for (const item of items) { await pool.execute("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]); }
    sendRes(res, null, "Order cancelled");
  } catch (err) { console.error(err); sendError(res, "Failed: " + err.message, 500); }
});

app.put("/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const [orders] = await pool.execute("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'shipped'", [req.params.id, req.user.userId]);
    if (orders.length === 0) return sendError(res, "Order not found or wrong status", 400);
    await pool.execute("UPDATE orders SET status = 'completed', completed_at = NOW() WHERE id = ?", [req.params.id]);
    sendRes(res, null, "Confirmed");
  } catch (err) { console.error(err); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/:id", authMiddleware, async (req, res) => {
  try {
    const [orders] = await pool.execute("SELECT * FROM orders WHERE id = ? AND user_id = ?", [req.params.id, req.user.userId]);
    if (orders.length === 0) return sendError(res, "Order not found", 404);
    const order = orders[0];
    const [items] = await pool.execute("SELECT * FROM order_items WHERE order_id = ?", [req.params.id]);
    order.items = items;
    sendRes(res, order, "OK");
  } catch (err) { console.error(err); sendError(res, "Failed: " + err.message, 500); }
});

const PORT = process.env.ORDER_SERVICE_PORT || 5003;
app.listen(PORT, async () => {
  console.log("Order service on port " + PORT);
  try { await pool.getConnection(); console.log("MySQL OK"); } catch(e) { console.warn("MySQL:", e.message); }
});

module.exports = app;