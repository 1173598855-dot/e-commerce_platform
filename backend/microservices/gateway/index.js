const express = require("express");
const http = require("http");
require("dotenv").config();

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  console.log(new Date().toISOString() + " - " + req.method + " " + req.url);
  next();
});

function proxyRequest(req, res, targetHost, targetPort) {
  const chunks = [];
  req.on("data", chunk => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString();
    const options = {
      hostname: targetHost,
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: Object.assign({}, req.headers, { "content-length": Buffer.byteLength(body) })
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on("error", (err) => {
      console.error("Proxy error:", err.message);
      res.status(502).json({ success: false, message: "服务不可用", error: err.message });
    });
    if (body && req.headers["content-type"] === "application/json") {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
}

const SERVICES = {
  user: { host: "localhost", port: process.env.USER_SERVICE_PORT || 4001 },
  product: { host: "localhost", port: process.env.PRODUCT_SERVICE_PORT || 4002 },
  order: { host: "localhost", port: process.env.ORDER_SERVICE_PORT || 4003 },
  mq: { host: "localhost", port: process.env.MQ_SERVICE_PORT || 4004 },
  search: { host: "localhost", port: process.env.SEARCH_SERVICE_PORT || 4005 }
};

app.use("/api/user", (req, res) => proxyRequest(req, res, SERVICES.user.host, SERVICES.user.port));
app.use("/api/product", (req, res) => proxyRequest(req, res, SERVICES.product.host, SERVICES.product.port));
app.use("/api/order", (req, res) => proxyRequest(req, res, SERVICES.order.host, SERVICES.order.port));
app.use("/api/mq", (req, res) => proxyRequest(req, res, SERVICES.mq.host, SERVICES.mq.port));
app.use("/api/search", (req, res) => proxyRequest(req, res, SERVICES.search.host, SERVICES.search.port));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), services: Object.keys(SERVICES).reduce((acc, key) => { acc[key] = "running"; return acc; }, {}) });
});

const PORT = process.env.GATEWAY_PORT || 4000;
const server = app.listen(PORT, () => {
  console.log("API Gateway on port " + PORT);
  Object.entries(SERVICES).forEach(([name, svc]) => console.log("  - " + name + ": http://localhost:" + PORT + "/api/" + name));
});

process.on("SIGTERM", () => { console.log("Shutting down..."); server.close(() => process.exit(0)); });

module.exports = app;