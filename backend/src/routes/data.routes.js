const express = require('express');
const router = express.Router();
const dataController = require('../controllers/data.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/overview', authenticateToken, dataController.getDataOverview);
router.get('/sales-trend', authenticateToken, dataController.getSalesTrend);
router.get('/product-ranking', dataController.getProductRanking);
router.get('/user-activity', authenticateToken, dataController.getUserActivity);

module.exports = router;
