const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "ecommerce_jwt_secret_key_2024";

function getRequestId(res) {
  return res.getHeader?.("X-Request-Id") || res.req?.headers?.["x-request-id"] || undefined;
}

function sendRes(res, data, msg, httpStatus) {
  res.status(httpStatus || 200).json({
    code: 200,
    data: data || null,
    message: msg || "ok",
    requestId: getRequestId(res),
  });
}

function sendError(res, msg, httpStatus, errorCode) {
  const status = httpStatus || 400;
  res.status(status).json({
    code: errorCode || status,
    data: null,
    message: msg || "Request failed",
    requestId: getRequestId(res),
  });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return sendError(res, "请先登录", 401, 30001);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return sendError(res, "Token无效或已过期", 401, 30002);
  }
}

function generateToken(payload, expiresIn) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn || "7d" });
}

module.exports = { sendRes, sendError, authMiddleware, generateToken, JWT_SECRET };
