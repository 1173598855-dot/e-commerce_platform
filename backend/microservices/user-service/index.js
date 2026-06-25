const express = require("express");
require("dotenv").config();
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

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

app.get("/health", (req, res) => sendRes(res, { service: "user-service", status: "running" }, "OK"));

app.post("/register", async (req, res) => {
  try {
    const { phone, password, nickname } = req.body;
    if (!phone || !password) return sendError(res, "Phone and password required", 400);
    const [ex] = await pool.execute("SELECT id FROM users WHERE phone = ?", [phone]);
    if (ex.length > 0) return sendError(res, "Phone already registered", 400);
    const hashed = await bcrypt.hash(password, 10);
    const r = await pool.execute("INSERT INTO users (phone, password, nickname, created_at) VALUES (?, ?, ?, NOW())", [phone, hashed, nickname || "User"]);
    const token = jwt.sign({ userId: r.insertId, phone }, process.env.JWT_SECRET || "ecommerce_jwt_secret_key_2024", { expiresIn: "7d" });
    sendRes(res, { token, userId: r.insertId, phone, nickname: nickname || "User" }, "Register OK");
  } catch (err) { console.error(err); sendError(res, "Register failed", 500); }
});

app.post("/sms-login", async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return sendError(res, "Phone and code required", 400);
    if (code !== "1234") return sendError(res, "Invalid code", 400);
    const [users] = await pool.execute("SELECT id, phone, nickname, avatar, points FROM users WHERE phone = ?", [phone]);
    let u;
    if (users.length === 0) {
      const r = await pool.execute("INSERT INTO users (phone, nickname, created_at) VALUES (?, ?, NOW())", [phone, "User_" + phone.slice(-4)]);
      u = { id: r.insertId, phone, nickname: "User_" + phone.slice(-4), avatar: null, points: 0 };
    } else { u = users[0]; }
    const token = jwt.sign({ userId: u.id, phone: u.phone }, process.env.JWT_SECRET || "ecommerce_jwt_secret_key_2024", { expiresIn: "7d" });
    sendRes(res, { token, userId: u.id, phone: u.phone, nickname: u.nickname, avatar: u.avatar, points: u.points }, "Login OK");
  } catch (err) { console.error(err); sendError(res, "Login failed", 500); }
});

app.post("/password-login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return sendError(res, "Phone and password required", 400);
    const [users] = await pool.execute("SELECT id, phone, password, nickname, avatar, points FROM users WHERE phone = ?", [phone]);
    if (users.length === 0) return sendError(res, "User not found", 404);
    const valid = await bcrypt.compare(password, users[0].password);
    if (!valid) return sendError(res, "Wrong password", 400);
    const u = users[0];
    const token = jwt.sign({ userId: u.id, phone: u.phone }, process.env.JWT_SECRET || "ecommerce_jwt_secret_key_2024", { expiresIn: "7d" });
    sendRes(res, { token, userId: u.id, phone: u.phone, nickname: u.nickname, avatar: u.avatar, points: u.points }, "Login OK");
  } catch (err) { console.error(err); sendError(res, "Login failed", 500); }
});

app.post("/send-code", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return sendError(res, "Phone required", 400);
    console.log("SMS code for " + phone + ": 1234");
    sendRes(res, null, "Code sent");
  } catch (err) { console.error(err); sendError(res, "Failed", 500); }
});

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.execute("SELECT id, phone, nickname, avatar, points, created_at FROM users WHERE id = ?", [req.user.userId]);
    if (users.length === 0) return sendError(res, "User not found", 404);
    sendRes(res, users[0], "OK");
  } catch (err) { console.error(err); sendError(res, "Failed", 500); }
});

app.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { nickname, avatar } = req.body;
    const fields = []; const params = [];
    if (nickname) { fields.push("nickname = ?"); params.push(nickname); }
    if (avatar) { fields.push("avatar = ?"); params.push(avatar); }
    if (fields.length === 0) return sendError(res, "Nothing to update", 400);
    params.push(req.user.userId);
    await pool.execute("UPDATE users SET " + fields.join(", ") + " WHERE id = ?", params);
    sendRes(res, null, "Updated");
  } catch (err) { console.error(err); sendError(res, "Failed", 500); }
});

const PORT = process.env.USER_SERVICE_PORT || 4001;
app.listen(PORT, async () => {
  console.log("User service on port " + PORT);
  try { await pool.getConnection(); console.log("MySQL OK"); } catch(e) { console.warn("MySQL:", e.message); }
});

module.exports = app;