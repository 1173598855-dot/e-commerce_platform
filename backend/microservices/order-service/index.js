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

app.get("/health", (req, res) => sendRes(res, { service: "order-service", status: "running" }, "OK"));

// ==================== 购物车 ====================
app.get("/cart", authMiddleware, async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image as product_image, p.stock
       FROM cart_items ci JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ? AND p.status = 1`, [req.user.userId]
    );
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    sendRes(res, { items, total: total.toFixed(2) });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.post("/cart/add", authMiddleware, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    if (!product_id) return sendError(res, "product_id required", 400);
    const [prods] = await pool.query("SELECT id, stock FROM products WHERE id = ? AND status = 1", [product_id]);
    if (prods.length === 0) return sendError(res, "Product not found", 404);
    if (prods[0].stock < quantity) return sendError(res, "Insufficient stock", 400);
    const [existing] = await pool.query("SELECT id FROM cart_items WHERE user_id = ? AND product_id = ?", [req.user.userId, product_id]);
    if (existing.length > 0) {
      await pool.query("UPDATE cart_items SET quantity = quantity + ? WHERE id = ?", [quantity, existing[0].id]);
    } else {
      await pool.query("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)", [req.user.userId, product_id, quantity]);
    }
    sendRes(res, null, "Added to cart");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.put("/cart/:id", authMiddleware, async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return sendError(res, "quantity >= 1 required", 400);
    const [rows] = await pool.query("SELECT id FROM cart_items WHERE id = ? AND user_id = ?", [req.params.id, req.user.userId]);
    if (rows.length === 0) return sendError(res, "Not found", 404);
    await pool.query("UPDATE cart_items SET quantity = ? WHERE id = ?", [quantity, req.params.id]);
    sendRes(res, null, "Updated");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.delete("/cart/:id", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id FROM cart_items WHERE id = ? AND user_id = ?", [req.params.id, req.user.userId]);
    if (rows.length === 0) return sendError(res, "Not found", 404);
    await pool.query("DELETE FROM cart_items WHERE id = ?", [req.params.id]);
    sendRes(res, null, "Removed");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.delete("/cart/clear", authMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM cart_items WHERE user_id = ?", [req.user.userId]);
    sendRes(res, null, "Cart cleared");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

// ==================== 订单 ====================
app.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const status = req.query.status || "";
    let where = "o.user_id = ?";
    const params = [userId];
    if (status) { where += " AND o.status = ?"; params.push(status); }
    const [orders] = await pool.query(
      `SELECT o.*, oi.product_id, oi.quantity, oi.price as item_price, oi.subtotal,
              p.name as product_name, p.image as product_image
       FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id
       WHERE ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ count }]] = await pool.query(`SELECT COUNT(DISTINCT o.id) as count FROM orders o WHERE ${where}`, params);
    const orderMap = {};
    for (const row of orders) {
      if (!orderMap[row.id]) {
        orderMap[row.id] = { id: row.id, order_no: row.order_no, total_amount: row.total_amount, status: row.status, created_at: row.created_at, items: [] };
      }
      if (row.product_name) orderMap[row.id].items.push({ product_id: row.product_id, product_name: row.product_name, product_image: row.product_image, quantity: row.quantity, price: row.item_price, subtotal: row.subtotal });
    }
    sendRes(res, { list: Object.values(orderMap), pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) } });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { items, shipping_address, remark } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return sendError(res, "Items required", 400);
    let totalAmount = 0;
    const orderItems = [];
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const item of items) {
        const [prods] = await conn.execute("SELECT price, stock FROM products WHERE id = ? AND status = 1 FOR UPDATE", [item.product_id]);
        if (prods.length === 0) throw new Error("Product not found: " + item.product_id);
        if (prods[0].stock < item.quantity) throw new Error("Insufficient stock for product " + item.product_id);
        const subtotal = prods[0].price * item.quantity;
        totalAmount += subtotal;
        orderItems.push({ product_id: item.product_id, quantity: item.quantity, price: prods[0].price, subtotal });
        await conn.execute("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.product_id]);
      }
      const orderNo = "ORD" + Date.now() + Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      const [oR] = await conn.query(
        "INSERT INTO orders (order_no, user_id, total_amount, status, shipping_address, remark) VALUES (?, ?, ?, 'pending', ?, ?)",
        [orderNo, userId, totalAmount, shipping_address ? JSON.stringify(shipping_address) : null, remark || ""]
      );
      const orderId = oR.insertId;
      for (const item of orderItems) {
        await conn.query("INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)",
          [orderId, item.product_id, item.quantity, item.price, item.subtotal]);
      }
      await conn.commit();
      sendRes(res, { orderId, orderNo, totalAmount: totalAmount.toFixed(2) }, "Order created");
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  } catch (err) { sendError(res, err.message || "Create failed", 500); }
});

app.get("/:id", authMiddleware, async (req, res) => {
  try {
    const [orders] = await pool.query("SELECT * FROM orders WHERE id = ? AND user_id = ?", [req.params.id, req.user.userId]);
    if (orders.length === 0) return sendError(res, "Not found", 404);
    const [items] = await pool.query("SELECT * FROM order_items WHERE order_id = ?", [req.params.id]);
    orders[0].items = items;
    sendRes(res, orders[0]);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.put("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const [orders] = await pool.query("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status IN ('pending','paid')", [req.params.id, req.user.userId]);
    if (orders.length === 0) return sendError(res, "Not found or wrong status", 400);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", [req.params.id]);
      const [items] = await conn.execute("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [req.params.id]);
      for (const item of items) await conn.execute("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
    sendRes(res, null, "Order cancelled");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.put("/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const [orders] = await pool.query("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'shipped'", [req.params.id, req.user.userId]);
    if (orders.length === 0) return sendError(res, "Not found or wrong status", 400);
    await pool.query("UPDATE orders SET status = 'completed', completed_at = NOW() WHERE id = ?", [req.params.id]);
    sendRes(res, null, "Confirmed");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

// ==================== 支付 ====================
app.post("/payment/mock", authMiddleware, async (req, res) => {
  try {
    const { orderId, paymentMethod = "alipay" } = req.body;
    if (!orderId) return sendError(res, "orderId required", 400);
    const [orders] = await pool.query("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'pending'", [orderId, req.user.userId]);
    if (orders.length === 0) return sendError(res, "Order not found or already paid", 404);
    await new Promise((r) => setTimeout(r, 500));
    await pool.query("UPDATE orders SET status = 'paid', payment_method = ?, paid_at = NOW() WHERE id = ?", [paymentMethod, orderId]);
    sendRes(res, { orderId, amount: orders[0].total_amount, paymentMethod, transactionId: "TXN" + Date.now() }, "Payment success");
  } catch (err) { sendError(res, "Payment failed", 500); }
});

app.get("/payment/:orderId/status", authMiddleware, async (req, res) => {
  try {
    const [orders] = await pool.query("SELECT id, order_no, total_amount, status, payment_method, paid_at FROM orders WHERE id = ? AND user_id = ?", [req.params.orderId, req.user.userId]);
    if (orders.length === 0) return sendError(res, "Not found", 404);
    sendRes(res, orders[0]);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/payment/history", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const [records] = await pool.query(
      "SELECT id, order_no, total_amount, status, payment_method, paid_at FROM orders WHERE user_id = ? AND status != 'pending' ORDER BY paid_at DESC LIMIT ? OFFSET ?",
      [req.user.userId, pageSize, offset]
    );
    const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status != 'pending'", [req.user.userId]);
    sendRes(res, { list: records, pagination: { page, pageSize, total: count } });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

// ==================== 物流 ====================
app.get("/logistics/:orderId", authMiddleware, async (req, res) => {
  try {
    const [trackings] = await pool.query(
      "SELECT lt.id, lt.order_id, lt.tracking_company, lt.tracking_number, lt.status FROM logistics_tracking lt INNER JOIN orders o ON lt.order_id = o.id WHERE o.id = ? AND o.user_id = ?",
      [req.params.orderId, req.user.userId]
    );
    if (trackings.length === 0) return sendError(res, "No logistics info", 404);
    const [traces] = await pool.query("SELECT content, location, created_at FROM logistics_traces WHERE tracking_id = ? ORDER BY created_at ASC", [trackings[0].id]);
    sendRes(res, { ...trackings[0], traces });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

const PORT = process.env.ORDER_SERVICE_PORT || 4003;
app.listen(PORT, async () => {
  console.log("Order service on port " + PORT);
  try { await pool.getConnection(); console.log("MySQL OK"); } catch(e) { console.warn("MySQL:", e.message); }
});

module.exports = app;