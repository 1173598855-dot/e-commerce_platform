const { mysqlPool } = require("../config/database");
const { sendRes, sendError } = require("../utils/response.util");

async function getChatSessions(req, res) {
  try {
    const userId = req.user.userId;

    const [partners] = await mysqlPool.execute(
      "SELECT CASE WHEN from_user_id = ? THEN to_user_id ELSE from_user_id END as other_user_id, MAX(created_at) as last_message_time FROM chat_messages WHERE from_user_id = ? OR to_user_id = ? GROUP BY other_user_id ORDER BY last_message_time DESC",
      [userId, userId, userId]
    );

    const sessions = [];
    for (const row of partners) {
      const otherId = row.other_user_id;
      
      const [[lastMsg]] = await mysqlPool.execute(
        "SELECT content FROM chat_messages WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?) ORDER BY created_at DESC LIMIT 1",
        [userId, otherId, otherId, userId]
      );

      const [[unreadRow]] = await mysqlPool.execute(
        "SELECT COUNT(*) as unread FROM chat_messages WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0",
        [otherId, userId]
      );

      const [[userRow]] = await mysqlPool.execute(
        "SELECT nickname, avatar FROM users WHERE id = ?",
        [otherId]
      );

      sessions.push({
        other_user_id: otherId,
        last_message_time: row.last_message_time,
        last_content: lastMsg ? lastMsg.content : "",
        unread_count: unreadRow.unread || 0,
        nickname: userRow ? userRow.nickname : "用户",
        avatar: userRow ? userRow.avatar : "",
      });
    }

    sendRes(res, sessions);
  } catch (err) {
    console.error("getChatSessions error:", err);
    sendError(res, "获取聊天会话失败", 500);
  }
}

async function getChatMessages(req, res) {
  try {
    const userId = req.user.userId;
    const { other_user_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;

    const [messages] = await mysqlPool.execute(
      "SELECT cm.*, CASE WHEN cm.from_user_id = ? THEN u2.nickname ELSE u1.nickname END as sender_name, CASE WHEN cm.from_user_id = ? THEN u2.avatar ELSE u1.avatar END as sender_avatar FROM chat_messages cm LEFT JOIN users u1 ON cm.from_user_id = u1.id LEFT JOIN users u2 ON cm.to_user_id = u2.id WHERE (cm.from_user_id = ? AND cm.to_user_id = ?) OR (cm.from_user_id = ? AND cm.to_user_id = ?) ORDER BY cm.created_at DESC LIMIT ? OFFSET ?",
      [userId, userId, userId, other_user_id, other_user_id, userId, pageSize, offset]
    );

    await mysqlPool.execute(
      "UPDATE chat_messages SET is_read = 1 WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0",
      [other_user_id, userId]
    );

    messages.reverse();
    sendRes(res, messages);
  } catch (err) {
    console.error("getChatMessages error:", err);
    sendError(res, "获取消息失败", 500);
  }
}

async function sendMessage(req, res) {
  try {
    const userId = req.user.userId;
    const { to_user_id, order_id, message_type = "text", content } = req.body;

    if (!to_user_id || !content) {
      return sendError(res, "接收方和内容不能为空", 400);
    }

    const result = await mysqlPool.execute(
      "INSERT INTO chat_messages (from_user_id, to_user_id, order_id, message_type, content) VALUES (?, ?, ?, ?, ?)",
      [userId, to_user_id, order_id || null, message_type, content]
    );

    sendRes(res, { id: result.insertId }, "消息发送成功");
  } catch (err) {
    console.error("sendMessage error:", err);
    sendError(res, "发送消息失败", 500);
  }
}

async function getUnreadCount(req, res) {
  try {
    const userId = req.user.userId;

    const [[{ count }]] = await mysqlPool.execute(
      "SELECT COUNT(*) as count FROM chat_messages WHERE to_user_id = ? AND is_read = 0",
      [userId]
    );

    sendRes(res, { unreadCount: count });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    sendError(res, "获取未读数失败", 500);
  }
}

module.exports = {
  getChatSessions,
  getChatMessages,
  sendMessage,
  getUnreadCount,
};
