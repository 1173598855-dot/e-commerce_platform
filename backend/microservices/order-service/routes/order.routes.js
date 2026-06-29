const express = require('express');
const { authMiddleware } = require('../../shared');
const controller = require('../controllers/order.controller');

const router = express.Router();

router.get('/health', controller.health);
router.get('/cart', authMiddleware, controller.cartList);
router.post('/cart/add', authMiddleware, controller.cartAdd);
router.put('/cart/:id', authMiddleware, controller.cartUpdate);
router.delete('/cart/:id', authMiddleware, controller.cartDelete);
router.delete('/cart/clear', authMiddleware, controller.cartClear);
router.get('/', authMiddleware, controller.list);
router.post('/', authMiddleware, controller.create);
router.get('/:id', authMiddleware, controller.detail);
router.put('/:id/cancel', authMiddleware, controller.cancel);
router.put('/:id/confirm', authMiddleware, controller.confirm);
router.post('/payment/mock', authMiddleware, controller.mockPayment);
router.get('/payment/:orderId/status', authMiddleware, controller.paymentStatus);
router.get('/payment/history', authMiddleware, controller.paymentHistory);
router.get('/logistics/:orderId', authMiddleware, controller.logistics);

module.exports = router;
