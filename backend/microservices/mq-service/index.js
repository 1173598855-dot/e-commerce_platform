const express = require("express");
require("dotenv").config();
const mysql = require("mysql2/promise");
const redis = require("redis");

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
    redisClient.on("error", err => console.log("Redis Error", err.message));
    await redisClient.connect();
  } catch (err) { console.warn("Redis failed"); redisClient = null; }
}
initRedis();

function sendRes(res, data, msg) { res.json({ success: true, data: data || null, message: msg || "success", timestamp: Date.now() }); }
function sendError(res, msg, code) { res.status(code || 400).json({ success: false, message: msg, timestamp: Date.now() }); }

app.get("/health", (req, res) => sendRes(res, { service: "mq-service", status: "running" }, "OK"));

app.post("/publish", async (req, res) => {
  try {
    const { channel, message } = req.body;
    if (!channel || !message) return sendError(res, "Channel and message required", 400);
    if (!redisClient) return sendError(res, "Redis not connected", 500);
    await redisClient.publish(channel, JSON.stringify(message));
    sendRes(res, null, "Message published");
  } catch (err) { console.error(err); sendError(res, "Publish failed", 500); }
});

app.post("/tasks/send-notification", async (req, res) => {
  try {
    const { user_id, type, title, content, related_id } = req.body;
    if (!user_id || !type || !title || !content) return sendError(res, "Params incomplete", 400);
    await pool.execute(
      "INSERT INTO notifications (user_id, type, title, content, is_read, related_id, created_at) VALUES (?, ?, ?, ?, 0, ?, NOW())",
      [user_id, type, title, content, related_id || null]
    );
    if (redisClient) {
      try { await redisClient.publish("notifications", JSON.stringify({ type: "notification_sent", user_id, title })); } catch (e) {}
    }
    sendRes(res, null, "Notification sent");
  } catch (err) { console.error(err); sendError(res, "Send failed", 500); }
});

const PORT = process.env.MQ_SERVICE_PORT || 4004;
app.listen(PORT, async () => {
  console.log("MQ service on port " + PORT);
  try { await pool.getConnection(); console.log("MySQL OK"); } catch(e) { console.warn("MySQL:", e.message); }
});

module.exports = app;