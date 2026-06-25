const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.get('/sessions', authenticateToken, chatController.getChatSessions);
router.get('/messages/:other_user_id', authenticateToken, chatController.getChatMessages);
router.post('/send', authenticateToken, chatController.sendMessage);
router.get('/unread', authenticateToken, chatController.getUnreadCount);

module.exports = router;
