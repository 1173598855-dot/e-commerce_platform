const express = require("express");
const http = require("http");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const app = express();

// ==================== 安全与基础中间件 ====================
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
}));
app.use(express.json());

// ==================== 请求ID ====================
app.use((req, res, next) => {
  const requestId = req.headers["x-request-id"] || uuidv4();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

// ==================== 统一响应包装 ====================
function respondSuccess(res, statusCode, data, message) {
  return res.status(statusCode).json({
    success: true,
    code: "OK",
    message: message || "ok",
    requestId: res.getHeader("X-Request-Id"),
    data,
  });
}

function respondError(res, statusCode, code, message) {
  return res.status(statusCode).json({
    success: false,
    code: code || "ERROR",
    message: message || "请求处理失败",
    requestId: res.getHeader("X-Request-Id"),
  });
}

const JWT_SECRET = process.env.JWT_SECRET || "ecommerce_jwt_secret_key_2024";

// ==================== 统一日志 ====================
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms) [requestId=${req.requestId}]`);
  });
  next();
});

// ==================== 限流 ====================
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 100;

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  if (!rateLimitStore.has(ip)) { rateLimitStore.set(ip, []); }
  const timestamps = rateLimitStore.get(ip).filter((t) => t > now - RATE_LIMIT_WINDOW);
  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);
  res.setHeader("X-RateLimit-Limit", RATE_LIMIT_MAX);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, RATE_LIMIT_MAX - timestamps.length));
  if (timestamps.length > RATE_LIMIT_MAX) {
    return respondError(res, 429, "RATE_LIMITED", "请求过于频繁，请稍后再试");
  }
  next();
}
app.use(rateLimiter);

setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitStore) {
    const valid = timestamps.filter((t) => t > now - RATE_LIMIT_WINDOW);
    if (valid.length === 0) rateLimitStore.delete(ip);
    else rateLimitStore.set(ip, valid);
  }
}, 5 * 60 * 1000);

// ==================== JWT 鉴权中间件 ====================
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) { return respondError(res, 401, "UNAUTHORIZED", "请先登录"); }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return respondError(res, 401, "TOKEN_INVALID", "Token无效或已过期");
  }
}

// ==================== 服务映射 ====================
const SERVICES = {
  user:    { host: process.env.USER_SERVICE_HOST || "user-service", port: parseInt(process.env.USER_SERVICE_PORT) || 4001 },
  product: { host: process.env.PRODUCT_SERVICE_HOST || "product-service", port: parseInt(process.env.PRODUCT_SERVICE_PORT) || 4002 },
  order:   { host: process.env.ORDER_SERVICE_HOST || "order-service", port: parseInt(process.env.ORDER_SERVICE_PORT) || 4003 },
  mq:      { host: process.env.MQ_SERVICE_HOST || "mq-service", port: parseInt(process.env.MQ_SERVICE_PORT) || 4004 },
  search:  { host: process.env.SEARCH_SERVICE_HOST || "search-service", port: parseInt(process.env.SEARCH_SERVICE_PORT) || 4005 },
  auth:    { host: process.env.AUTH_SERVICE_HOST || "auth-service", port: parseInt(process.env.AUTH_SERVICE_PORT) || 4006 },
};

// ==================== 反向代理 ====================
function proxyRequest(req, res, targetHost, targetPort) {
  const body = req.body ? JSON.stringify(req.body) : "";

  console.log(`[PROXY] ${req.method} ${req.originalUrl} -> ${targetHost}:${targetPort}${req.url}`);

  const forwardHeaders = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() !== "host" && key.toLowerCase() !== "content-length") {
      forwardHeaders[key] = value;
    }
  }
  forwardHeaders["host"] = targetHost + ":" + targetPort;
  forwardHeaders["x-forwarded-for"] = req.ip || req.connection.remoteAddress;
  forwardHeaders["content-type"] = "application/json";
  forwardHeaders["x-request-id"] = req.requestId;
  if (body.length > 0) {
    forwardHeaders["content-length"] = Buffer.byteLength(body);
  } else {
    forwardHeaders["content-length"] = "0";
  }

  const options = {
    hostname: targetHost,
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: forwardHeaders,
    timeout: 30000,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers, "x-request-id": req.requestId };
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error(`[PROXY ERROR] ${targetHost}:${targetPort} -> ${err.message}`);
    if (!res.headersSent) {
      respondError(res, 502, "SERVICE_UNAVAILABLE", "服务暂时不可用: " + err.message);
    }
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      respondError(res, 504, "GATEWAY_TIMEOUT", "请求超时");
    }
  });

  if (body.length > 0) { proxyReq.write(body); }
  proxyReq.end();
}

// ==================== 统一转发函数 ====================
function forwardViaV1(prefix, ...middlewares) {
  const handlers = middlewares.length > 0 ? middlewares : [];
  const svc = routeServiceMap[prefix];
  
  // 原始路径 /api/*
  app.use(prefix, ...handlers, (req, res) => {
    if (!svc) return respondError(res, 404, "ROUTE_NOT_FOUND", "接口不存在");
    proxyRequest(req, res, svc.host, svc.port);
  });
  
  // v1 前缀 /api/v1/*
  const v1Prefix = "/api/v1" + prefix.replace("/api", "");
  app.use(v1Prefix, ...handlers, (req, res) => {
    if (!svc) return respondError(res, 404, "ROUTE_NOT_FOUND", "接口不存在");
    proxyRequest(req, res, svc.host, svc.port);
  });
}

const routeServiceMap = {
  "/api/auth": SERVICES.auth,
  "/api/products": SERVICES.product,
  "/api/categories": SERVICES.product,
  "/api/search": SERVICES.search,
  "/api/videos": SERVICES.product,
  "/api/user": SERVICES.user,
  "/api/orders": SERVICES.order,
  "/api/payments": SERVICES.order,
  "/api/addresses": SERVICES.user,
  "/api/reviews": SERVICES.product,
  "/api/favorites": SERVICES.user,
  "/api/skus": SERVICES.product,
  "/api/coupons": SERVICES.user,
  "/api/points": SERVICES.user,
  "/api/notifications": SERVICES.mq,
  "/api/chat": SERVICES.mq,
  "/api/ai": SERVICES.product,
  "/api/data": SERVICES.product,
  "/api/merchants": SERVICES.user,
  "/api/logistics": SERVICES.order,
  "/api/upload": SERVICES.product,
};

// ==================== 路由规则 ====================

// 公开路由
forwardViaV1("/api/auth");
forwardViaV1("/api/products");
forwardViaV1("/api/categories");
forwardViaV1("/api/search");
forwardViaV1("/api/videos");

// 健康检查（单独处理）
app.use(["/api/health", "/api/v1/health"], async (req, res) => {
  const serviceStatus = {};
  const checks = Object.entries(SERVICES).map(([name, svc]) => {
    return new Promise((resolve) => {
      const checkReq = http.request(
        { hostname: svc.host, port: svc.port, path: "/health", method: "GET", timeout: 3000 },
        (checkRes) => { serviceStatus[name] = checkRes.statusCode === 200 ? "healthy" : "degraded"; resolve(); }
      );
      checkReq.on("error", () => { serviceStatus[name] = "down"; resolve(); });
      checkReq.on("timeout", () => { checkReq.destroy(); serviceStatus[name] = "timeout"; resolve(); });
      checkReq.end();
    });
  });
  await Promise.all(checks);
  const allHealthy = Object.values(serviceStatus).every((s) => s === "healthy");
  const payload = { gateway: "healthy", services: serviceStatus, timestamp: new Date().toISOString() };
  if (allHealthy) {
    respondSuccess(res, 200, payload, "所有服务正常");
  } else {
    respondError(res, 503, "SERVICE_DEGRADED", "部分服务异常");
  }
});

// 需要鉴权的路由
const authRoutesConfig = [
  "/api/user",
  "/api/orders",
  "/api/payments",
  "/api/addresses",
  "/api/reviews",
  "/api/favorites",
  "/api/skus",
  "/api/coupons",
  "/api/points",
  "/api/notifications",
  "/api/chat",
  "/api/ai",
  "/api/data",
  "/api/merchants",
  "/api/logistics",
  "/api/upload",
];

authRoutesConfig.forEach((route) => {
  forwardViaV1(route, authenticateToken);
});

// 404 兜底
app.use((req, res) => {
  respondError(res, 404, "ROUTE_NOT_FOUND", "接口不存在: " + req.originalUrl);
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  respondError(res, err.status || 500, "INTERNAL_ERROR", err.message || "服务器内部错误");
});

const PORT = process.env.GATEWAY_PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  API Gateway started on port ${PORT}`);
  console.log(`========================================`);
  Object.entries(SERVICES).forEach(([name, svc]) => {
    console.log(`  /api/${name} -> localhost:${svc.port}`);
  });
  console.log(`========================================\n`);
});

process.on("SIGTERM", () => {
  console.log("Gateway shutting down...");
  server.close(() => process.exit(0));
});

module.exports = app;
