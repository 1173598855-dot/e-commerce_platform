const express = require('express');
const router = express.Router();
const skuController = require('../controllers/sku.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// 公开路由
router.get('/:id/options', skuController.getSkuOptions);
router.get('/:id/list', skuController.getSkus);
router.post('/:id/find', skuController.getSkuBySpec);

// 管理员路由
router.post('/', authenticateToken, skuController.createSku);
router.post('/spec-options', authenticateToken, skuController.createSpecOptions);

module.exports = router;
