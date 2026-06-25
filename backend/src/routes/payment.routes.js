const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.post('/mock', authenticateToken, paymentController.mockPayment);
router.get('/:orderId/status', authenticateToken, paymentController.getPaymentStatus);
router.get('/history', authenticateToken, paymentController.getPaymentHistory);

module.exports = router;
