const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/', couponController.getCouponList);
router.post('/receive', authenticateToken, couponController.receiveCoupon);
router.get('/my', authenticateToken, couponController.getUserCoupons);
router.post('/use', authenticateToken, couponController.useCoupon);

module.exports = router;
