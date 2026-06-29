const express = require('express');
const { authMiddleware } = require('../../shared');
const controller = require('../controllers/user.controller');

const router = express.Router();

router.get('/health', controller.health);

router.get('/addresses', authMiddleware, controller.getAddressList);
router.post('/addresses', authMiddleware, controller.addAddress);
router.put('/addresses/:id', authMiddleware, controller.updateAddress);
router.delete('/addresses/:id', authMiddleware, controller.deleteAddress);
router.get('/addresses/default', authMiddleware, controller.getDefaultAddress);

router.post('/favorites', authMiddleware, controller.favoriteProduct);
router.delete('/favorites', authMiddleware, controller.unfavoriteProduct);
router.get('/favorites', authMiddleware, controller.getFavorites);
router.get('/favorites/:product_id/status', authMiddleware, controller.checkFavorite);

router.get('/coupons', authMiddleware, controller.getCouponList);
router.post('/coupons/receive', authMiddleware, controller.receiveCoupon);
router.get('/coupons/my', authMiddleware, controller.getUserCoupons);
router.post('/coupons/use', authMiddleware, controller.useCoupon);

router.get('/points', authMiddleware, controller.getPoints);
router.post('/points/add', authMiddleware, controller.addPoints);
router.post('/points/consume', authMiddleware, controller.consumePoints);
router.get('/points/logs', authMiddleware, controller.getPointsLogs);

router.post('/merchants/apply', authMiddleware, controller.applyMerchant);
router.get('/merchants/info', authMiddleware, controller.getMerchantInfo);
router.get('/merchants/products', authMiddleware, controller.getMerchantProducts);

module.exports = router;
