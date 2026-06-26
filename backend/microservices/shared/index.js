const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "ecommerce_jwt_secret_key_2024";

function sendRes(res, data, msg, code) {
  res.status(code || 200).json({ success: true, data: data || null, message: msg || "success", timestamp: Date.now() });
}

function sendError(res, msg, code) {
  res.status(code || 400).json({ success: false, message: msg, timestamp: Date.now() });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return sendError(res, "请先登录", 401);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return sendError(res, "Token无效或已过期", 401);
  }
}

function generateToken(payload, expiresIn) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn || "7d" });
}

module.exports = { sendRes, sendError, authMiddleware, generateToken, JWT_SECRET };