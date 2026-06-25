const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/product/:id', reviewController.getReviews);
router.post('/', authenticateToken, reviewController.createReview);
router.get('/my', authenticateToken, reviewController.getMyReviews);

module.exports = router;
