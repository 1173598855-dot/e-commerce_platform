const express = require("express");
const http = require("http");
const jwt = require("jsonwebtoken");
const redis = require("redis");
const helmet = require("helmet");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { getForwardPath } = require("./route-utils");
const {
  buildGatewayRedisClientOptions,
  createMemoryRateLimitStore,
  createRateLimiter,
  createRedisRateLimitStore,
} = require("./rate-limit");
let createLogger;
try {
  ({ createLogger } = require("../shared/logger"));
} catch (err) {
  ({ createLogger } = require("./shared/logger"));
}
require("dotenv").config();

const logger = createLogger({ service: "gateway" });

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
// 统一响应格式: { code: number, data: any, message: string }
// code: 200 成功，其他为错误码（number 类型）
function respondSuccess(res, data, message) {
  return res.status(200).json({
    code: 200,
    data: data || null,
    message: message || "ok",
    requestId: res.getHeader("X-Request-Id"),
  });
}

function respondError(res, httpStatus, code, message) {
  // httpStatus: HTTP 状态码
  // code: 业务错误码（number 类型）
  const statusCodeMap = {
    400: 400,
    401: 401,
    403: 403,
    404: 404,
    429: 429,
    502: 502,
    503: 503,
    504: 504,
  };
  
  const responseCode = code || statusCodeMap[httpStatus] || 500;
  
  return res.status(httpStatus || 400).json({
    code: responseCode,
    data: null,
    message: message || "请求处理失败",
    requestId: res.getHeader("X-Request-Id"),
  });
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

// ==================== 统一日志 ====================
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("request completed", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.connection.remoteAddress,
    });
  });
  next();
});

// ==================== 限流 ====================
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 100;
let redisRateLimitClient = null;
const memoryRateLimitStore = createMemoryRateLimitStore({ windowMs: RATE_LIMIT_WINDOW });
let activeRateLimitStore = memoryRateLimitStore;
const rateLimitStore = {
  increment(clientId) {
    return activeRateLimitStore.increment(clientId);
  },
};

const rateLimiter = createRateLimiter({
  store: rateLimitStore,
  limit: RATE_LIMIT_MAX,
  windowMs: RATE_LIMIT_WINDOW,
  respondError,
  logger,
});
app.use(rateLimiter);

async function initRedisRateLimiter() {
  try {
    redisRateLimitClient = redis.createClient(buildGatewayRedisClientOptions());
    redisRateLimitClient.on("error", (err) => logger.warn("gateway redis error", { error: err.message }));
    await redisRateLimitClient.connect();
    activeRateLimitStore = createRedisRateLimitStore(redisRateLimitClient, {
      windowMs: RATE_LIMIT_WINDOW,
      keyPrefix: "gateway-rate-limit",
    });
    logger.info("gateway rate limiter using redis");
  } catch (err) {
    logger.warn("gateway redis rate limiter unavailable, using memory fallback", { error: err.message });
    activeRateLimitStore = memoryRateLimitStore;
  }
}

initRedisRateLimiter();

setInterval(() => {
  memoryRateLimitStore.cleanup();
}, 5 * 60 * 1000);

// ==================== JWT 鉴权中间件 ====================
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"]; 
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) { return respondError(res, 401, 30001, "请先登录"); }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return respondError(res, 401, 30002, "Token无效或已过期");
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
function proxyRequest(req, res, targetHost, targetPort, forwardPath) {
  const body = req.body ? JSON.stringify(req.body) : "";

  logger.info("proxy request", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    targetHost,
    targetPort,
    forwardPath,
  });

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
    path: forwardPath,
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
    logger.error("proxy request failed", {
      requestId: req.requestId,
      targetHost,
      targetPort,
      error: err.message,
    });
    if (!res.headersSent) {
      respondError(res, 502, 502, "服务暂时不可用: " + err.message);
    }
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      respondError(res, 504, 504, "请求超时");
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
    if (!svc) return respondError(res, 404, 404, "接口不存在");
    const forwardPath = getForwardPath(req.originalUrl, prefix, svc.targetBase);
    proxyRequest(req, res, svc.host, svc.port, forwardPath);
  });
  
  // v1 前缀 /api/v1/*
  const v1Prefix = "/api/v1" + prefix.replace("/api", "");
  app.use(v1Prefix, ...handlers, (req, res) => {
    if (!svc) return respondError(res, 404, 404, "接口不存在");
    const forwardPath = getForwardPath(req.originalUrl, prefix, svc.targetBase);
    proxyRequest(req, res, svc.host, svc.port, forwardPath);
  });
}

const routeServiceMap = {
  "/api/auth": { ...SERVICES.auth, targetBase: "" },
  "/api/products": { ...SERVICES.product, targetBase: "" },
  "/api/categories": { ...SERVICES.product, targetBase: "/categories" },
  "/api/search": { ...SERVICES.search, targetBase: "" },
  "/api/videos": { ...SERVICES.product, targetBase: "/videos" },
  "/api/user": { ...SERVICES.user, targetBase: "" },
  "/api/orders": { ...SERVICES.order, targetBase: "" },
  "/api/payments": { ...SERVICES.order, targetBase: "/payment" },
  "/api/addresses": { ...SERVICES.user, targetBase: "/addresses" },
  "/api/reviews": { ...SERVICES.product, targetBase: "/reviews" },
  "/api/favorites": { ...SERVICES.user, targetBase: "/favorites" },
  "/api/skus": { ...SERVICES.product, targetBase: "/skus" },
  "/api/coupons": { ...SERVICES.user, targetBase: "/coupons" },
  "/api/points": { ...SERVICES.user, targetBase: "/points" },
  "/api/notifications": { ...SERVICES.mq, targetBase: "" },
  "/api/chat": { ...SERVICES.mq, targetBase: "/chat" },
  "/api/ai": { ...SERVICES.product, targetBase: "/recommend" },
  "/api/data": { ...SERVICES.product, targetBase: "/dashboard" },
  "/api/merchants": { ...SERVICES.user, targetBase: "/merchants" },
  "/api/logistics": { ...SERVICES.order, targetBase: "/logistics" },
  "/api/upload": { ...SERVICES.product, targetBase: "/upload" },
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
    respondSuccess(res, payload, "所有服务正常");
  } else {
    respondError(res, 503, 503, "部分服务异常");
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
  respondError(res, 404, 404, "接口不存在: " + req.originalUrl);
});

// 全局错误处理
app.use((err, req, res, next) => {
  logger.error("unhandled gateway error", { requestId: req.requestId, error: err.message, stack: err.stack });
  respondError(res, err.status || 500, 500, err.message || "服务器内部错误");
});

const PORT = process.env.GATEWAY_PORT || 4000;
const server = app.listen(PORT, () => {
  logger.info("api gateway started", { port: Number(PORT), services: SERVICES });
});

process.on("SIGTERM", () => {
  logger.info("gateway shutting down");
  if (redisRateLimitClient) {
    redisRateLimitClient.quit().catch((err) => logger.warn("gateway redis quit failed", { error: err.message }));
  }
  server.close(() => process.exit(0));
});

module.exports = app;
