const express = require('express');
require('dotenv').config();
const searchRoutes = require('./routes/search.routes');
const { searchService } = require('./services/search.service');

const app = express();
app.use(express.json());
app.use(searchRoutes);

const PORT = process.env.SEARCH_SERVICE_PORT || 4005;
app.listen(PORT, async () => {
  console.log('Search service on port ' + PORT);
  try { await searchService.pool.getConnection(); console.log('MySQL OK'); } catch (e) { console.warn('MySQL:', e.message); }
});

module.exports = app;
