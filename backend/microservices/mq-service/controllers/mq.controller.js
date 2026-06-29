const { sendRes, sendError } = require('../../shared');
const { mqService } = require('../services/mq.service');

async function health(req, res) {
  return sendRes(res, await mqService.health(), 'OK');
}

async function publish(req, res) {
  try {
    await mqService.publish(req.body);
    return sendRes(res, null, 'Published');
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

async function sendNotification(req, res) {
  try {
    await mqService.sendNotification(req.body);
    return sendRes(res, null, 'Notification sent');
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

async function listNotifications(req, res) {
  try {
    const result = await mqService.listNotifications(req.user.userId, req.query);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

async function markNotificationRead(req, res) {
  try {
    await mqService.markNotificationRead(req.user.userId, req.params.id);
    return sendRes(res, null, 'Marked as read');
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    await mqService.markAllNotificationsRead(req.user.userId);
    return sendRes(res, null, 'All marked as read');
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

async function deleteNotification(req, res) {
  try {
    await mqService.deleteNotification(req.user.userId, req.params.id);
    return sendRes(res, null, 'Deleted');
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

async function listSessions(req, res) {
  try {
    const result = await mqService.listSessions(req.user.userId);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

async function listMessages(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await mqService.listMessages(req.user.userId, req.params.other_user_id, limit);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

async function sendMessage(req, res) {
  try {
    const result = await mqService.sendMessage(req.user.userId, req.body);
    return sendRes(res, result, 'Sent');
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

async function unreadCount(req, res) {
  try {
    const result = await mqService.unreadCount(req.user.userId);
    return sendRes(res, result);
  } catch (err) {
    return sendError(res, err.message || 'Failed', err.httpStatus || 500);
  }
}

module.exports = {
  health,
  publish,
  sendNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  listSessions,
  listMessages,
  sendMessage,
  unreadCount,
};
