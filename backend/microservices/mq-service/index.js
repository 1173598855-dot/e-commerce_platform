const express = require("express");
require("dotenv").config();
const mysql = require("mysql2/promise");
const redis = require("redis");
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

let redisClient = null;
async function initRedis() {
  try {
    redisClient = redis.createClient({
      socket: { host: process.env.REDIS_HOST || "localhost", port: parseInt(process.env.REDIS_PORT) || 6379 }
    });
    redisClient.on("error", (err) => console.warn("Redis Error:", err.message));
    await redisClient.connect();
    console.log("Redis connected");
  } catch (err) {
    console.warn("Redis unavailable:", err.message);
    redisClient = null;
  }
}

app.get("/health", (req, res) => sendRes(res, { service: "mq-service", status: "running", redis: redisClient ? "connected" : "disconnected" }, "OK"));

// ==================== 发布消息 ====================
app.post("/publish", async (req, res) => {
  try {
    const { channel, message } = req.body;
    if (!channel || !message) return sendError(res, "channel and message required", 400);
    if (!redisClient) return sendError(res, "Redis not connected", 500);
    await redisClient.publish(channel, JSON.stringify(message));
    sendRes(res, null, "Published");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

// ==================== 通知 ====================
app.post("/tasks/send-notification", async (req, res) => {
  try {
    const { user_id, type, title, content, related_id } = req.body;
    if (!user_id || !type || !title || !content) return sendError(res, "Params incomplete", 400);
    await pool.query(
      "INSERT INTO notifications (user_id, type, title, content, is_read, related_id, created_at) VALUES (?, ?, ?, ?, 0, ?, NOW())",
      [user_id, type, title, content, related_id || null]
    );
    if (redisClient) {
      try { await redisClient.publish("notifications", JSON.stringify({ type: "notification_sent", user_id, title })); } catch (e) {}
    }
    sendRes(res, null, "Notification sent");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?", [req.user.userId, pageSize, offset]);
    const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM notifications WHERE user_id = ?", [req.user.userId]);
    const [[{ unread }]] = await pool.query("SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0", [req.user.userId]);
    sendRes(res, { list: rows, unreadCount: unread, pagination: { page, pageSize, total: count } });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [req.params.id, req.user.userId]);
    sendRes(res, null, "Marked as read");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.put("/read-all", authMiddleware, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [req.user.userId]);
    sendRes(res, null, "All marked as read");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM notifications WHERE id = ? AND user_id = ?", [req.params.id, req.user.userId]);
    sendRes(res, null, "Deleted");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

// ==================== 聊天 ====================
app.get("/chat/sessions", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT CASE WHEN from_user_id = ? THEN to_user_id ELSE from_user_id END as other_id, MAX(created_at) as last_time FROM chat_messages WHERE from_user_id = ? OR to_user_id = ? GROUP BY other_id ORDER BY last_time DESC",
      [req.user.userId, req.user.userId, req.user.userId]
    );
    const sessions = [];
    for (const row of rows) {
      const [lastMsg] = await pool.query("SELECT content FROM chat_messages WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?) ORDER BY created_at DESC LIMIT 1", [req.user.userId, row.other_id, row.other_id, req.user.userId]);
      const [unread] = await pool.query("SELECT COUNT(*) as c FROM chat_messages WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0", [row.other_id, req.user.userId]);
      const [user] = await pool.query("SELECT nickname, avatar FROM users WHERE id = ?", [row.other_id]);
      sessions.push({ other_user_id: row.other_id, last_content: lastMsg[0] ? lastMsg[0].content : "", unread_count: unread[0].c, nickname: user[0] ? user[0].nickname : "用户", avatar: user[0] ? user[0].avatar : "" });
    }
    sendRes(res, sessions);
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/chat/messages/:other_user_id", authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const [messages] = await pool.query(
      "SELECT * FROM chat_messages WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?) ORDER BY created_at DESC LIMIT ?",
      [req.user.userId, req.params.other_user_id, req.params.other_user_id, req.user.userId, limit]
    );
    await pool.query("UPDATE chat_messages SET is_read = 1 WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0", [req.params.other_user_id, req.user.userId]);
    sendRes(res, messages.reverse());
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.post("/chat/send", authMiddleware, async (req, res) => {
  try {
    const { to_user_id, order_id, message_type, content } = req.body;
    if (!to_user_id || !content) return sendError(res, "to_user_id and content required", 400);
    const [result] = await pool.query(
      "INSERT INTO chat_messages (from_user_id, to_user_id, order_id, message_type, content) VALUES (?, ?, ?, ?, ?)",
      [req.user.userId, to_user_id, order_id || null, message_type || "text", content]
    );
    sendRes(res, { id: result.insertId }, "Sent");
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

app.get("/chat/unread", authMiddleware, async (req, res) => {
  try {
    const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM chat_messages WHERE to_user_id = ? AND is_read = 0", [req.user.userId]);
    sendRes(res, { unreadCount: count });
  } catch (err) { console.error("Route error:", err.message); sendError(res, "Failed: " + err.message, 500); }
});

const PORT = process.env.MQ_SERVICE_PORT || 4004;
app.listen(PORT, async () => {
  console.log("MQ service on port " + PORT);
  try { await pool.getConnection(); console.log("MySQL OK"); } catch(e) { console.warn("MySQL:", e.message); }
  await initRedis();
});

module.exports = app;