const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// 购物车相关
router.post('/cart/add', authenticateToken, orderController.addToCart);
router.get('/cart', authenticateToken, orderController.getCart);
router.put('/cart/:id', authenticateToken, orderController.updateCartItem);
router.delete('/cart/:id', authenticateToken, orderController.removeCartItem);
router.delete('/cart/clear', authenticateToken, orderController.clearCart);

// 订单相关
router.post('/', authenticateToken, orderController.createOrder);
router.get('/', authenticateToken, orderController.getMyOrders);
router.put('/:id/cancel', authenticateToken, orderController.cancelOrder);
router.put('/:id/confirm', authenticateToken, orderController.confirmOrder);

module.exports = router;
