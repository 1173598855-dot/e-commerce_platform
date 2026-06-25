const express = require("express");
require("dotenv").config();
const mysql = require("mysql2/promise");

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

// Health check MUST be before /:id
app.get("/health", (req, res) => sendRes(res, { service: "product-service", status: "running" }, "OK"));

// Product list
app.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const keyword = req.query.keyword || "";
    const categoryId = req.query.categoryId || "";

    let whereClause = "status = 1";
    const params = [];
    if (keyword) { whereClause += " AND (name LIKE ? OR description LIKE ?)"; params.push("%" + keyword + "%", "%" + keyword + "%"); }
    if (categoryId) { whereClause += " AND category_id = ?"; params.push(categoryId); }

    const [products] = await pool.execute(
      "SELECT * FROM products WHERE " + whereClause + " ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [...params, pageSize, offset]
    );
    const [[{ count }]] = await pool.execute("SELECT COUNT(*) as count FROM products WHERE " + whereClause, params);
    sendRes(res, { list: products, pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) } }, "OK");
  } catch (err) { console.error(err); sendError(res, "Failed", 500); }
});

// Hot products
app.get("/hot", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const [products] = await pool.execute(
      "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 1 ORDER BY p.sales DESC LIMIT ?",
      [limit]
    );
    sendRes(res, { list: products }, "OK");
  } catch (err) { console.error(err); sendError(res, "Failed", 500); }
});

// Product detail
app.get("/:id", async (req, res) => {
  try {
    const [products] = await pool.execute(
      "SELECT p.*, c.name as category_name, m.name as merchant_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN merchants m ON p.merchant_id = m.id WHERE p.id = ? AND p.status = 1",
      [req.params.id]
    );
    if (products.length === 0) return sendError(res, "Product not found", 404);
    const product = products[0];
    const [skus] = await pool.execute("SELECT * FROM product_skus WHERE product_id = ? AND status = 1", [req.params.id]);
    product.skus = skus;
    const [images] = await pool.execute("SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order", [req.params.id]);
    product.images = images.map(i => i.image_url);
    const [reviews] = await pool.execute("SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 10", [req.params.id]);
    product.reviews = reviews;
    product.avg_rating = reviews.length > 0 ? (reviews.reduce((s, r) => s + parseInt(r.rating), 0) / reviews.length).toFixed(1) : 0;
    sendRes(res, product, "OK");
  } catch (err) { console.error(err); sendError(res, "Failed", 500); }
});

const PORT = process.env.PRODUCT_SERVICE_PORT || 4002;
app.listen(PORT, async () => {
  console.log("Product service on port " + PORT);
  try { await pool.getConnection(); console.log("MySQL OK"); } catch(e) { console.warn("MySQL:", e.message); }
});

module.exports = app;