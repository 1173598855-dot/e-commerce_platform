const express = require('express');
require('dotenv').config();
const orderRoutes = require('./routes/order.routes');
const { orderService } = require('./services/order.service');
const { createLogger } = require('../shared/logger');
const { buildOrderTimeoutWorkerConfig, createOrderTimeoutWorker } = require('./order-timeout-worker');

const app = express();
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(orderRoutes);

const logger = createLogger({ service: 'order-service' });
const orderTimeoutWorker = createOrderTimeoutWorker({
  service: orderService,
  logger,
  config: buildOrderTimeoutWorkerConfig(),
});

const PORT = process.env.ORDER_SERVICE_PORT || 4003;
app.listen(PORT, async () => {
  logger.info('order_service_started', { port: PORT });
  try {
    const conn = await orderService.pool.getConnection();
    conn.release();
    logger.info('order_service_mysql_ok');
  } catch (e) { logger.warn('order_service_mysql_failed', { error: e.message }); }
  orderTimeoutWorker.start();
});

module.exports = app;
