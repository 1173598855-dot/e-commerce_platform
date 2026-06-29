const express = require('express');
const { authMiddleware } = require('../../shared');
const controller = require('../controllers/search.controller');

const router = express.Router();

router.get('/health', controller.health);
router.get('/', controller.search);
router.get('/suggestions', controller.suggestions);
router.get('/hot', controller.hot);
router.post('/history', authMiddleware, controller.saveHistory);
router.get('/history', authMiddleware, controller.history);
router.delete('/history', authMiddleware, controller.clearHistory);

module.exports = router;
