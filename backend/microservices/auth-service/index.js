const express = require('express');
require('dotenv').config();
const { authService } = require('./services/auth.service');
const authRoutes = require('./routes/auth.routes');

const app = express();
app.use(express.json());
app.use(authRoutes);

const PORT = process.env.AUTH_SERVICE_PORT || 4006;
app.listen(PORT, async () => {
  console.log('Auth service on port ' + PORT);
  try { await authService.pool.getConnection(); console.log('MySQL connected'); } catch (e) { console.warn('MySQL:', e.message); }
  await authService.initRedis();
});

module.exports = app;
