const express = require('express');
const { authMiddleware } = require('../../shared');
const controller = require('../controllers/mq.controller');

const router = express.Router();

router.get('/health', controller.health);
router.post('/publish', controller.publish);
router.post('/tasks/send-notification', controller.sendNotification);
router.get('/', authMiddleware, controller.listNotifications);
router.put('/:id/read', authMiddleware, controller.markNotificationRead);
router.put('/read-all', authMiddleware, controller.markAllNotificationsRead);
router.delete('/:id', authMiddleware, controller.deleteNotification);
router.get('/chat/sessions', authMiddleware, controller.listSessions);
router.get('/chat/messages/:other_user_id', authMiddleware, controller.listMessages);
router.post('/chat/send', authMiddleware, controller.sendMessage);
router.get('/chat/unread', authMiddleware, controller.unreadCount);

module.exports = router;
