const express = require('express');
require('dotenv').config();
const productRoutes = require('./routes/product.routes');
const { productService } = require('./services/product.service');

const app = express();
app.use(express.json());
app.use(productRoutes);

const PORT = process.env.PRODUCT_SERVICE_PORT || 4002;
app.listen(PORT, async () => {
  console.log('Product service on port ' + PORT);
  try { await productService.pool.getConnection(); console.log('MySQL OK'); } catch (e) { console.warn('MySQL:', e.message); }
});

module.exports = app;
