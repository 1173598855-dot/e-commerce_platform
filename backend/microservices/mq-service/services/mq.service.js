const mysql = require('mysql2/promise');
const redis = require('redis');
const { buildRedisClientOptions } = require('../../shared/redis-config');

class MqService {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3314,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'ecommerce',
    });
    this.redisClient = null;
  }

  async initRedis() {
    try {
      this.redisClient = redis.createClient(buildRedisClientOptions());
      this.redisClient.on('error', (err) => console.warn('Redis Error:', err.message));
      await this.redisClient.connect();
      console.log('Redis connected');
    } catch (err) {
      console.warn('Redis unavailable:', err.message);
      this.redisClient = null;
    }
  }

  async health() {
    return {
      service: 'mq-service',
      status: 'running',
      redis: this.redisClient ? 'connected' : 'disconnected',
    };
  }

  async publish(body) {
    const { channel, message } = body;
    if (!channel || !message) throw Object.assign(new Error('channel and message required'), { httpStatus: 400 });
    if (!this.redisClient) throw Object.assign(new Error('Redis not connected'), { httpStatus: 500 });
    await this.redisClient.publish(channel, JSON.stringify(message));
    return null;
  }

  async sendNotification(body) {
    const { user_id, type, title, content, related_id } = body;
    if (!user_id || !type || !title || !content) throw Object.assign(new Error('Params incomplete'), { httpStatus: 400 });
    await this.pool.query(
      'INSERT INTO notifications (user_id, type, title, content, is_read, related_id, created_at) VALUES (?, ?, ?, ?, 0, ?, NOW())',
      [user_id, type, title, content, related_id || null]
    );
    if (this.redisClient) {
      try {
        await this.redisClient.publish('notifications', JSON.stringify({ type: 'notification_sent', user_id, title }));
      } catch (err) {
        console.warn('Redis publish failed:', err.message);
      }
    }
    return null;
  }

  async listNotifications(userId, query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const [rows] = await this.pool.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [userId, pageSize, offset]);
    const [[{ count }]] = await this.pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?', [userId]);
    const [[{ unread }]] = await this.pool.query('SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
    return { list: rows, unreadCount: unread, pagination: { page, pageSize, total: count } };
  }

  async markNotificationRead(userId, id) {
    await this.pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    return null;
  }

  async markAllNotificationsRead(userId) {
    await this.pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
    return null;
  }

  async deleteNotification(userId, id) {
    await this.pool.query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
    return null;
  }

  async listSessions(userId) {
    const [rows] = await this.pool.query(
      'SELECT CASE WHEN from_user_id = ? THEN to_user_id ELSE from_user_id END as other_id, MAX(created_at) as last_time FROM chat_messages WHERE from_user_id = ? OR to_user_id = ? GROUP BY other_id ORDER BY last_time DESC',
      [userId, userId, userId]
    );
    const sessions = [];
    for (const row of rows) {
      const [lastMsg] = await this.pool.query('SELECT content FROM chat_messages WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?) ORDER BY created_at DESC LIMIT 1', [userId, row.other_id, row.other_id, userId]);
      const [unread] = await this.pool.query('SELECT COUNT(*) as c FROM chat_messages WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0', [row.other_id, userId]);
      const [user] = await this.pool.query('SELECT nickname, avatar FROM users WHERE id = ?', [row.other_id]);
      sessions.push({
        other_user_id: row.other_id,
        last_content: lastMsg[0] ? lastMsg[0].content : '',
        unread_count: unread[0].c,
        nickname: user[0] ? user[0].nickname : '用户',
        avatar: user[0] ? user[0].avatar : '',
      });
    }
    return sessions;
  }

  async listMessages(userId, otherUserId, limit) {
    const [messages] = await this.pool.query(
      'SELECT * FROM chat_messages WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?) ORDER BY created_at DESC LIMIT ?',
      [userId, otherUserId, otherUserId, userId, limit]
    );
    await this.pool.query('UPDATE chat_messages SET is_read = 1 WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0', [otherUserId, userId]);
    return messages.reverse();
  }

  async sendMessage(userId, body) {
    const { to_user_id, order_id, message_type, content } = body;
    if (!to_user_id || !content) throw Object.assign(new Error('to_user_id and content required'), { httpStatus: 400 });
    const [result] = await this.pool.query(
      'INSERT INTO chat_messages (from_user_id, to_user_id, order_id, message_type, content) VALUES (?, ?, ?, ?, ?)',
      [userId, to_user_id, order_id || null, message_type || 'text', content]
    );
    return { id: result.insertId };
  }

  async unreadCount(userId) {
    const [[{ count }]] = await this.pool.query('SELECT COUNT(*) as count FROM chat_messages WHERE to_user_id = ? AND is_read = 0', [userId]);
    return { unreadCount: count };
  }
}

const mqService = new MqService();

module.exports = { mqService };
