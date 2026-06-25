const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchant.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.post('/apply', merchantController.applyMerchant);
router.get('/info', authenticateToken, merchantController.getMerchantInfo);
router.get('/products', authenticateToken, merchantController.getMerchantProducts);

module.exports = router;
