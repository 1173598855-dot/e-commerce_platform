const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

// 发送通知（系统内部使用）
async function sendNotification(userId, type, title, content, relatedId = null) {
  try {
    await mysqlPool.execute(
      'INSERT INTO notifications (user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?)',
      [userId, type, title, content, relatedId]
    );
    return true;
  } catch (err) {
    console.error('发送通知失败:', err);
    return false;
  }
}

// 获取用户通知列表
async function getNotifications(req, res) {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const [notifications] = await mysqlPool.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset]
    );

    const [[{ count }]] = await mysqlPool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
      [userId]
    );

    const [[{ unread }]] = await mysqlPool.execute(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    sendRes(res, {
      list: notifications,
      unreadCount: unread,
      pagination: { page, pageSize, total: count },
    });
  } catch (err) {
    sendError(res, '获取通知失败', 500);
  }
}

// 标记为已读
async function markAsRead(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    await mysqlPool.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    sendRes(res, null, '已标记为已读');
  } catch (err) {
    sendError(res, '操作失败', 500);
  }
}

// 全部标记为已读
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.userId;

    await mysqlPool.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    sendRes(res, null, '已全部标记为已读');
  } catch (err) {
    sendError(res, '操作失败', 500);
  }
}

// 删除通知
async function deleteNotification(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    await mysqlPool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    sendRes(res, null, '已删除');
  } catch (err) {
    sendError(res, '删除失败', 500);
  }
}

module.exports = {
  sendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
