const express = require('express');
require('dotenv').config();
const userRoutes = require('./routes/user.routes');
const { userService } = require('./services/user.service');

const app = express();
app.use(express.json());
app.use(userRoutes);

const PORT = process.env.USER_SERVICE_PORT || 4001;
app.listen(PORT, async () => {
  console.log('User service on port ' + PORT);
  try { await userService.pool.getConnection(); console.log('MySQL OK'); } catch (e) { console.warn('MySQL:', e.message); }
});

module.exports = app;
