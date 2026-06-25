const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

// 获取用户地址列表
async function getAddressList(req, res) {
  try {
    const userId = req.user.userId;

    const [addresses] = await mysqlPool.execute(
      'SELECT * FROM addresses WHERE user_id = ? AND status = 1 ORDER BY is_default DESC, created_at DESC',
      [userId]
    );

    sendRes(res, addresses);
  } catch (err) {
    sendError(res, '获取地址失败', 500);
  }
}

// 添加地址
async function addAddress(req, res) {
  try {
    const userId = req.user.userId;
    const { receiver_name, receiver_phone, province, city, district, detail_address, is_default } = req.body;

    if (!receiver_name || !receiver_phone || !province || !city || !district || !detail_address) {
      return sendError(res, '请填写完整的收货信息', 400);
    }

    // 如果是默认地址，先取消其他默认地址
    if (is_default) {
      await mysqlPool.execute(
        'UPDATE addresses SET is_default = 0 WHERE user_id = ?',
        [userId]
      );
    }

    const result = await mysqlPool.execute(
      'INSERT INTO addresses (user_id, receiver_name, receiver_phone, province, city, district, detail_address, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, receiver_name, receiver_phone, province, city, district, detail_address, is_default ? 1 : 0]
    );

    sendRes(res, { id: result.insertId }, '地址添加成功');
  } catch (err) {
    sendError(res, '添加地址失败', 500);
  }
}

// 更新地址
async function updateAddress(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { receiver_name, receiver_phone, province, city, district, detail_address, is_default } = req.body;

    const fields = [];
    const params = [];

    if (receiver_name !== undefined) { fields.push('receiver_name = ?'); params.push(receiver_name); }
    if (receiver_phone !== undefined) { fields.push('receiver_phone = ?'); params.push(receiver_phone); }
    if (province !== undefined) { fields.push('province = ?'); params.push(province); }
    if (city !== undefined) { fields.push('city = ?'); params.push(city); }
    if (district !== undefined) { fields.push('district = ?'); params.push(district); }
    if (detail_address !== undefined) { fields.push('detail_address = ?'); params.push(detail_address); }
    if (is_default !== undefined) {
      if (is_default) {
        await mysqlPool.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
        fields.push('is_default = 1');
      }
    }

    if (fields.length === 0) {
      return sendError(res, '没有需要更新的字段', 400);
    }

    params.push(id, userId);

    await mysqlPool.execute(
      `UPDATE addresses SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    sendRes(res, null, '地址更新成功');
  } catch (err) {
    sendError(res, '更新地址失败', 500);
  }
}

// 删除地址
async function deleteAddress(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    await mysqlPool.execute(
      'UPDATE addresses SET status = 0 WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    sendRes(res, null, '地址已删除');
  } catch (err) {
    sendError(res, '删除地址失败', 500);
  }
}

// 获取默认地址
async function getDefaultAddress(req, res) {
  try {
    const userId = req.user.userId;

    const [addresses] = await mysqlPool.execute(
      'SELECT * FROM addresses WHERE user_id = ? AND is_default = 1 AND status = 1 LIMIT 1',
      [userId]
    );

    sendRes(res, addresses[0] || null);
  } catch (err) {
    sendError(res, '获取默认地址失败', 500);
  }
}

module.exports = {
  getAddressList,
  addAddress,
  updateAddress,
  deleteAddress,
  getDefaultAddress,
};
