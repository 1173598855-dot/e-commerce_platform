const express = require('express');
require('dotenv').config();
const orderRoutes = require('./routes/order.routes');
const { orderService } = require('./services/order.service');

const app = express();
app.use(express.json());
app.use(orderRoutes);

const PORT = process.env.ORDER_SERVICE_PORT || 4003;
app.listen(PORT, async () => {
  console.log('Order service on port ' + PORT);
  try { await orderService.pool.getConnection(); console.log('MySQL OK'); } catch (e) { console.warn('MySQL:', e.message); }
});

module.exports = app;
