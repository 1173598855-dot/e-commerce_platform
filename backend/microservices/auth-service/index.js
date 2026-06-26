const express = require("express");
require("dotenv").config();
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const redis = require("redis");
const { sendRes, sendError, authMiddleware, generateToken } = require("./shared");

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "ecommerce",
  connectionLimit: 10,
});

const JWT_SECRET = process.env.JWT_SECRET || "ecommerce_jwt_secret_key_2024";

let redisClient = null;
async function initRedis() {
  try {
    redisClient = redis.createClient({
      socket: { host: process.env.REDIS_HOST || "localhost", port: parseInt(process.env.REDIS_PORT) || 6379 },
    });
    redisClient.on("error", (err) => console.warn("Redis Error:", err.message));
    await redisClient.connect();
    console.log("Redis connected");
  } catch (err) {
    console.warn("Redis unavailable:", err.message);
    redisClient = null;
  }
}

app.get("/health", (req, res) => sendRes(res, { service: "auth-service", status: "running" }, "OK"));

// ==================== 注册 ====================
app.post("/register", async (req, res) => {
  try {
    const { phone, password, nickname } = req.body;
    if (!phone || !password) return sendError(res, "手机号和密码不能为空", 400);
    const [existing] = await pool.query("SELECT id FROM users WHERE phone = ?", [phone]);
    if (existing.length > 0) return sendError(res, "该手机号已注册", 400);
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query("INSERT INTO users (phone, password, nickname) VALUES (?, ?, ?)", [phone, hashed, nickname || phone]);
    const token = generateToken({ userId: result.insertId, phone });
    sendRes(res, { userId: result.insertId, token, phone }, "注册成功");
  } catch (err) { console.error("Register error:", err); sendError(res, "注册失败", 500); }
});

// ==================== 密码登录 ====================
app.post("/password-login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return sendError(res, "手机号和密码不能为空", 400);
    const [users] = await pool.query("SELECT id, phone, password, nickname, avatar, points, status FROM users WHERE phone = ?", [phone]);
    if (users.length === 0) return sendError(res, "手机号或密码错误", 400);
    if (users[0].status === 0) return sendError(res, "账号已被禁用", 403);
    const valid = await bcrypt.compare(password, users[0].password);
    if (!valid) return sendError(res, "手机号或密码错误", 400);
    const { password: _, ...user } = users[0];
    const token = generateToken({ userId: user.id, phone: user.phone });
    await pool.query("UPDATE users SET last_login_time = NOW() WHERE id = ?", [user.id]);
    sendRes(res, { token, user }, "登录成功");
  } catch (err) { console.error("Password login error:", err); sendError(res, "登录失败", 500); }
});

// ==================== 发送验证码 ====================
app.post("/send-code", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return sendError(res, "手机号不能为空", 400);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (redisClient) {
      await redisClient.set(`sms:${phone}`, code, { EX: parseInt(process.env.SMS_CODE_EXPIRE) || 300 });
    }
    console.log(`[SMS] ${phone} -> ${code}`);
    sendRes(res, null, "验证码已发送");
  } catch (err) { console.error("Send code error:", err); sendError(res, "发送失败", 500); }
});

// ==================== 验证码登录 ====================
app.post("/sms-login", async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return sendError(res, "手机号和验证码不能为空", 400);

    let isValidCode = false;
    if (redisClient) {
      const storedCode = await redisClient.get(`sms:${phone}`);
      isValidCode = storedCode === code;
      if (isValidCode) await redisClient.del(`sms:${phone}`);
    } else {
      isValidCode = code === "1234";
    }
    if (!isValidCode) return sendError(res, "验证码错误或已过期", 400);

    const [users] = await pool.query("SELECT id, phone, nickname, avatar, points, status FROM users WHERE phone = ?", [phone]);
    let user;
    if (users.length === 0) {
      const [result] = await pool.query("INSERT INTO users (phone, nickname, login_type) VALUES (?, ?, 'sms')", [phone, "用户" + phone.slice(-4)]);
      user = { id: result.insertId, phone, nickname: "用户" + phone.slice(-4), avatar: null, points: 0 };
    } else {
      user = users[0];
      if (user.status === 0) return sendError(res, "账号已被禁用", 403);
      await pool.query("UPDATE users SET last_login_time = NOW() WHERE id = ?", [user.id]);
    }
    const token = generateToken({ userId: user.id, phone: user.phone });
    sendRes(res, { token, user }, "登录成功");
  } catch (err) { console.error("SMS login error:", err); sendError(res, "登录失败", 500); }
});

// ==================== 微信登录 ====================
app.post("/wx-login", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return sendError(res, "微信授权码不能为空", 400);
    const openid = "wx_demo_" + code;
    const [users] = await pool.query("SELECT id, phone, nickname, avatar, points, status FROM users WHERE wechat_openid = ?", [openid]);
    let user;
    if (users.length === 0) {
      const [result] = await pool.query("INSERT INTO users (phone, nickname, wechat_openid, login_type) VALUES (?, ?, ?, 'wechat')", ["", "微信用户", openid]);
      user = { id: result.insertId, nickname: "微信用户" };
    } else {
      user = users[0];
      if (user.status === 0) return sendError(res, "账号已被禁用", 403);
      await pool.query("UPDATE users SET last_login_time = NOW() WHERE id = ?", [user.id]);
    }
    const token = generateToken({ userId: user.id, phone: user.phone || "" });
    sendRes(res, { token, user }, "微信登录成功");
  } catch (err) { console.error("WeChat login error:", err); sendError(res, "微信登录失败", 500); }
});

// ==================== QQ 登录 ====================
app.post("/qq-login", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return sendError(res, "QQ授权码不能为空", 400);
    const openid = "qq_demo_" + code;
    const [users] = await pool.query("SELECT id, phone, nickname, avatar, points, status FROM users WHERE qq_openid = ?", [openid]);
    let user;
    if (users.length === 0) {
      const [result] = await pool.query("INSERT INTO users (phone, nickname, qq_openid, login_type) VALUES (?, ?, ?, 'qq')", ["", "QQ用户", openid]);
      user = { id: result.insertId, nickname: "QQ用户" };
    } else {
      user = users[0];
      if (user.status === 0) return sendError(res, "账号已被禁用", 403);
      await pool.query("UPDATE users SET last_login_time = NOW() WHERE id = ?", [user.id]);
    }
    const token = generateToken({ userId: user.id, phone: user.phone || "" });
    sendRes(res, { token, user }, "QQ登录成功");
  } catch (err) { console.error("QQ login error:", err); sendError(res, "QQ登录失败", 500); }
});

// ==================== 获取用户信息（已鉴权） ====================
app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query("SELECT id, phone, nickname, avatar, points, created_at FROM users WHERE id = ?", [req.user.userId]);
    if (users.length === 0) return sendError(res, "用户不存在", 404);
    sendRes(res, users[0]);
  } catch (err) { sendError(res, "获取信息失败", 500); }
});

// ==================== 更新资料 ====================
app.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { nickname, avatar } = req.body;
    const fields = []; const params = [];
    if (nickname) { fields.push("nickname = ?"); params.push(nickname); }
    if (avatar) { fields.push("avatar = ?"); params.push(avatar); }
    if (fields.length === 0) return sendError(res, "没有需要更新的字段", 400);
    params.push(req.user.userId);
    await pool.query("UPDATE users SET " + fields.join(", ") + " WHERE id = ?", params);
    sendRes(res, null, "更新成功");
  } catch (err) { sendError(res, "更新失败", 500); }
});

const PORT = process.env.AUTH_SERVICE_PORT || 4006;
app.listen(PORT, async () => {
  console.log("Auth service on port " + PORT);
  try { await pool.getConnection(); console.log("MySQL connected"); } catch (e) { console.warn("MySQL:", e.message); }
  await initRedis();
});

module.exports = app;