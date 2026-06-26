const express = require("express");
const http = require("http");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "ecommerce_jwt_secret_key_2024";

// ==================== 统一日志 ====================
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
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
    return res.status(429).json({ success: false, message: "请求过于频繁，请稍后再试" });
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
  if (!token) { return res.status(401).json({ success: false, message: "请先登录" }); }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Token无效或已过期" });
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

// ==================== 反向代理（v3: 从 req.body 重建） ====================
function proxyRequest(req, res, targetHost, targetPort) {
  // express.json() 已消费请求流，用 req.body 重建 body
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
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error(`[PROXY ERROR] ${targetHost}:${targetPort} -> ${err.message}`);
    if (!res.headersSent) { res.status(502).json({ success: false, message: "服务暂时不可用: " + err.message }); }
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    if (!res.headersSent) { res.status(504).json({ success: false, message: "请求超时" }); }
  });

  if (body.length > 0) { proxyReq.write(body); }
  proxyReq.end();
}

// ==================== 路由规则 ====================

app.use("/api/auth", (req, res) => proxyRequest(req, res, SERVICES.auth.host, SERVICES.auth.port));

app.use("/api/health", async (req, res) => {
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
  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    message: allHealthy ? "所有服务正常" : "部分服务异常",
    data: { gateway: "healthy", services: serviceStatus, timestamp: new Date().toISOString() },
  });
});

app.use("/api/products", (req, res) => proxyRequest(req, res, SERVICES.product.host, SERVICES.product.port));
app.use("/api/categories", (req, res) => proxyRequest(req, res, SERVICES.product.host, SERVICES.product.port));
app.use("/api/search", (req, res) => proxyRequest(req, res, SERVICES.search.host, SERVICES.search.port));
app.use("/api/videos", (req, res) => proxyRequest(req, res, SERVICES.product.host, SERVICES.product.port));

const authRoutesConfig = [
  { route: "/api/user", svc: SERVICES.user },
  { route: "/api/orders", svc: SERVICES.order },
  { route: "/api/payments", svc: SERVICES.order },
  { route: "/api/addresses", svc: SERVICES.user },
  { route: "/api/reviews", svc: SERVICES.product },
  { route: "/api/favorites", svc: SERVICES.user },
  { route: "/api/skus", svc: SERVICES.product },
  { route: "/api/coupons", svc: SERVICES.user },
  { route: "/api/points", svc: SERVICES.user },
  { route: "/api/notifications", svc: SERVICES.mq },
  { route: "/api/chat", svc: SERVICES.mq },
  { route: "/api/ai", svc: SERVICES.product },
  { route: "/api/data", svc: SERVICES.product },
  { route: "/api/merchants", svc: SERVICES.user },
  { route: "/api/logistics", svc: SERVICES.order },
  { route: "/api/upload", svc: SERVICES.product },
];

authRoutesConfig.forEach(({ route, svc }) => {
  app.use(route, authenticateToken, (req, res) => {
    proxyRequest(req, res, svc.host, svc.port);
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "接口不存在: " + req.originalUrl });
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