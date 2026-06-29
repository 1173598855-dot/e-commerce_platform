const express = require('express');
require('dotenv').config();
const mqRoutes = require('./routes/mq.routes');
const { mqService } = require('./services/mq.service');

const app = express();
app.use(express.json());
app.use(mqRoutes);

const PORT = process.env.MQ_SERVICE_PORT || 4004;
app.listen(PORT, async () => {
  console.log('MQ service on port ' + PORT);
  try { await mqService.pool.getConnection(); console.log('MySQL OK'); } catch (e) { console.warn('MySQL:', e.message); }
  await mqService.initRedis();
});

module.exports = app;
