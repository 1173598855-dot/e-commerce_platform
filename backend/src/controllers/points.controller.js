const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

// 获取用户积分
async function getPoints(req, res) {
  try {
    const userId = req.user.userId;
    const [users] = await mysqlPool.execute('SELECT points FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return sendError(res, '用户不存在', 404);
    }

    sendRes(res, { points: users[0].points });
  } catch (err) {
    sendError(res, '获取积分失败', 500);
  }
}

// 增加积分
async function addPoints(req, res) {
  try {
    const userId = req.user.userId;
    const { points, type, description, relatedId } = req.body;

    if (!points || !type) {
      return sendError(res, '积分数量和类型不能为空', 400);
    }

    await mysqlPool.execute('UPDATE users SET points = points + ? WHERE id = ?', [points, userId]);
    await mysqlPool.execute(
      'INSERT INTO points_logs (user_id, points, type, description, related_id) VALUES (?, ?, ?, ?, ?)',
      [userId, points, type, description || '', relatedId || null]
    );

    const [users] = await mysqlPool.execute('SELECT points FROM users WHERE id = ?', [userId]);
    sendRes(res, { points: users[0].points }, '积分变更成功');
  } catch (err) {
    console.error('积分错误:', err);
    sendError(res, '积分操作失败', 500);
  }
}

// 获取积分日志
async function getPointsLogs(req, res) {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const [logs] = await mysqlPool.execute(
      'SELECT * FROM points_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset]
    );

    const [[{ count }]] = await mysqlPool.execute('SELECT COUNT(*) as count FROM points_logs WHERE user_id = ?', [userId]);

    sendRes(res, { list: logs, pagination: { page, pageSize, total: count } });
  } catch (err) {
    sendError(res, '获取积分日志失败', 500);
  }
}

// 消费积分
async function consumePoints(req, res) {
  try {
    const userId = req.user.userId;
    const { points, type, relatedId } = req.body;

    if (!points || points <= 0) {
      return sendError(res, '积分数量必须大于0', 400);
    }

    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      const [users] = await connection.execute('SELECT points FROM users WHERE id = ? FOR UPDATE', [userId]);

      if (users.length === 0) {
        await connection.rollback();
        return sendError(res, '用户不存在', 404);
      }

      if (users[0].points < points) {
        await connection.rollback();
        return sendError(res, '积分余额不足', 400);
      }

      await connection.execute('UPDATE users SET points = points - ? WHERE id = ?', [points, userId]);
      await connection.execute(
        'INSERT INTO points_logs (user_id, points, type, related_id) VALUES (?, ?, ?, ?)',
        [userId, -points, type || 'consume', relatedId || null]
      );

      await connection.commit();

      const [newBalance] = await mysqlPool.execute('SELECT points FROM users WHERE id = ?', [userId]);
      sendRes(res, { points: newBalance[0].points }, '积分消费成功');
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('积分消费错误:', err);
    sendError(res, '积分消费失败', 500);
  }
}

module.exports = { getPoints, addPoints, getPointsLogs, consumePoints };

