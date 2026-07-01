const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

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
  return jwt.sign({ ...payload, role: normalizeRole(payload && payload.role) }, JWT_SECRET, { expiresIn: expiresIn || "7d" });
}

function normalizeRole(role) {
  return String(role || "customer").trim().toLowerCase();
}

const ROLE_PERMISSIONS = {
  admin: ["*"],
  merchant: ["refund:list", "refund:detail", "refund:review", "refund:submit", "order:ship", "product:manage", "export:manage", "operation:log:list"],
  customer: ["refund:submit"],
};

function normalizePermission(permission) {
  return String(permission || "").trim().toLowerCase();
}

function getUserPermissions(user) {
  const role = normalizeRole(user && user.role);
  const defaults = ROLE_PERMISSIONS[role] || [];
  const explicit = Array.isArray(user && user.permissions) ? user.permissions : [];
  return new Set([...defaults, ...explicit].map(normalizePermission));
}

function requirePermission(...requiredPermissions) {
  const required = requiredPermissions.map(normalizePermission).filter(Boolean);
  return (req, res, next) => {
    const permissions = getUserPermissions(req.user);
    const allowed = permissions.has("*") || required.every((permission) => permissions.has(permission));
    if (!allowed) return sendError(res, "Permission denied", 403, 30004);
    return next();
  };
}

function requireRole(...allowedRoles) {
  const allowed = new Set(allowedRoles.map(normalizeRole));
  return (req, res, next) => {
    const role = normalizeRole(req.user && req.user.role);
    if (!allowed.has(role)) return sendError(res, "Permission denied", 403, 30003);
    return next();
  };
}

module.exports = { sendRes, sendError, authMiddleware, generateToken, requireRole, requirePermission, JWT_SECRET };
