const express = require('express');
const { authMiddleware } = require('../../shared');
const controller = require('../controllers/product.controller');

const router = express.Router();

router.get('/health', controller.health);
router.get('/', controller.list);
router.get('/hot', controller.hot);
router.get('/recommend', controller.recommend);
router.get('/dashboard/overview', controller.dashboardOverview);
router.get('/dashboard/sales-trend', controller.dashboardSalesTrend);
router.get('/dashboard/top-products', controller.dashboardTopProducts);
router.get('/categories', controller.categories);
router.get('/categories/all', controller.categoriesAll);
router.get('/categories/:id', controller.categoryDetail);
router.get('/reviews/product/:id', controller.reviewsByProduct);
router.post('/reviews', authMiddleware, controller.submitReview);
router.get('/reviews/my', authMiddleware, controller.myReviews);
router.get('/skus/:productId/options', controller.skuOptions);
router.get('/skus/:productId/list', controller.skuList);
router.post('/skus/:productId/find', controller.skuFind);
router.get('/:id', controller.detail);

module.exports = router;
