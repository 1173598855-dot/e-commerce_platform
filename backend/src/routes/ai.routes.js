const express = require('express');
const router = express.Router();
const aiRecommendController = require('../controllers/ai_recommend.controller');
const aiChatController = require('../controllers/ai_chat.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/recommend', authenticateToken, aiRecommendController.getRecommendations);
router.post('/behavior', authenticateToken, aiRecommendController.recordBehavior);
router.post('/chat', authenticateToken, aiChatController.getAiReply);

module.exports = router;
