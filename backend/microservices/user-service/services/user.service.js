const mysql = require('mysql2/promise');
const { generateToken } = require('../../shared');
const { resolveAssetUrl } = require('../../shared/asset-url');

function formatPagination(page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

function formatUserAddressList(rows, page, pageSize, total) {
  return {
    list: rows,
    pagination: formatPagination(page, pageSize, total),
  };
}

function resolveUserProductAssets(rows) {
  if (!Array.isArray(rows)) return;
  rows.forEach((row) => {
    row.image = resolveAssetUrl(row.image);
    row.avatar = resolveAssetUrl(row.avatar);
    row.business_license = resolveAssetUrl(row.business_license);
  });
}

class UserService {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3314,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'ecommerce',
    });
  }

  async health() {
    return { service: 'user-service', status: 'running' };
  }

  async listAddresses(userId) {
    const [rows] = await this.pool.query(
      'SELECT * FROM addresses WHERE user_id = ? AND status = 1 ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    return rows;
  }

  async createAddress(userId, body) {
    const { receiver_name, receiver_phone, province, city, district, detail_address, is_default } = body;
    if (!receiver_name || !receiver_phone || !province || !city || !district || !detail_address) {
      throw Object.assign(new Error('No fields to update'), { httpStatus: 400 });
    }
    if (is_default) {
      await this.pool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }
    const [result] = await this.pool.query(
      'INSERT INTO addresses (user_id, receiver_name, receiver_phone, province, city, district, detail_address, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, receiver_name, receiver_phone, province, city, district, detail_address, is_default ? 1 : 0]
    );
    return { id: result.insertId };
  }

  async updateAddress(userId, id, body) {
    const fields = [];
    const params = [];
    ['receiver_name', 'receiver_phone', 'province', 'city', 'district', 'detail_address'].forEach((field) => {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(body[field]);
      }
    });

    if (body.is_default !== undefined) {
      if (body.is_default) {
        await this.pool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
      }
      fields.push('is_default = ?');
      params.push(body.is_default ? 1 : 0);
    }

    if (fields.length === 0) {
      throw Object.assign(new Error('No fields to update'), { httpStatus: 400 });
    }

    params.push(id, userId);
    await this.pool.query(`UPDATE addresses SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, params);
    return null;
  }

  async deleteAddress(userId, id) {
    await this.pool.query('UPDATE addresses SET status = 0 WHERE id = ? AND user_id = ?', [id, userId]);
    return null;
  }

  async defaultAddress(userId) {
    const [rows] = await this.pool.query(
      'SELECT * FROM addresses WHERE user_id = ? AND is_default = 1 AND status = 1 LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  }

  async favoriteProduct(userId, body) {
    const { product_id } = body;
    if (!product_id) throw Object.assign(new Error('product_id required'), { httpStatus: 400 });
    await this.pool.query('INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)', [userId, product_id]);
    return null;
  }

  async unfavoriteProduct(userId, body) {
    const { product_id } = body;
    if (!product_id) throw Object.assign(new Error('product_id required'), { httpStatus: 400 });
    await this.pool.query('DELETE FROM favorites WHERE user_id = ? AND product_id = ?', [userId, product_id]);
    return null;
  }

  async getFavorites(userId, query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const [rows] = await this.pool.query(
      'SELECT f.*, p.name, p.price, p.image, p.sales, c.name as category_name FROM favorites f JOIN products p ON f.product_id = p.id LEFT JOIN categories c ON p.category_id = c.id WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset]
    );
    resolveUserProductAssets(rows);
    const [[{ count }]] = await this.pool.query('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?', [userId]);
    return { list: rows, pagination: formatPagination(page, pageSize, count) };
  }

  async checkFavorite(userId, productId) {
    const [rows] = await this.pool.query('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?', [userId, productId]);
    return { isFavorite: rows.length > 0 };
  }

  async getCoupons() {
    const [rows] = await this.pool.query(
      "SELECT *, CASE WHEN type = 1 THEN CONCAT('min ', condition_amount, ' off ', discount_amount) WHEN type = 2 THEN CONCAT(discount_amount, ' discount') ELSE CONCAT('off ', discount_amount) END as display_text FROM coupons WHERE status = 1 AND valid_start <= NOW() AND valid_end >= NOW() AND issued_count < total_count ORDER BY discount_amount DESC"
    );
    return rows;
  }

  async receiveCoupon(userId, body) {
    const { coupon_id } = body;
    if (!coupon_id) throw Object.assign(new Error('coupon_id required'), { httpStatus: 400 });
    const [coupons] = await this.pool.query('SELECT * FROM coupons WHERE id = ? AND status = 1', [coupon_id]);
    if (coupons.length === 0) throw Object.assign(new Error('Not found'), { httpStatus: 404 });
    const coupon = coupons[0];
    const [owned] = await this.pool.query('SELECT COUNT(*) as c FROM user_coupons WHERE user_id = ? AND coupon_id = ? AND status = 1', [userId, coupon_id]);
    if (coupon.per_user_limit > 0 && owned[0].c >= coupon.per_user_limit) {
      throw Object.assign(new Error('No fields to update'), { httpStatus: 400 });
    }
    await this.pool.query('INSERT INTO user_coupons (user_id, coupon_id, expires_at) VALUES (?, ?, ?)', [userId, coupon_id, coupon.valid_end]);
    await this.pool.query('UPDATE coupons SET issued_count = issued_count + 1 WHERE id = ?', [coupon_id]);
    return null;
  }

  async getUserCoupons(userId, query) {
    const status = query.status || 'all';
    let where = 'uc.user_id = ?';
    const params = [userId];
    if (status === 'available') {
      where += ' AND uc.status = 1 AND uc.expires_at > NOW()';
    } else if (status === 'used') {
      where += ' AND uc.status = 2';
    } else if (status === 'expired') {
      where += ' AND (uc.status = 3 OR uc.expires_at <= NOW())';
    }
    const [rows] = await this.pool.query(
      'SELECT uc.*, c.name, c.type, c.discount_amount FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE ' + where + ' ORDER BY uc.expires_at ASC',
      params
    );
    return rows;
  }

  async useCoupon(userId, body) {
    const { user_coupon_id, order_id, order_amount } = body;
    if (!user_coupon_id || !order_id) throw Object.assign(new Error('Invalid coupon request'), { httpStatus: 400 });
    const [userCoupons] = await this.pool.query(
      'SELECT uc.*, c.type, c.condition_amount, c.discount_amount, c.min_order_amount FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 1',
      [user_coupon_id, userId]
    );
    if (userCoupons.length === 0) throw Object.assign(new Error('Coupon unavailable'), { httpStatus: 400 });
    const coupon = userCoupons[0];
    if (order_amount < coupon.min_order_amount) {
      throw Object.assign(new Error(`Order amount must reach ${coupon.min_order_amount}`), { httpStatus: 400 });
    }
    await this.pool.query('UPDATE user_coupons SET status = 2, order_id = ?, used_at = NOW() WHERE id = ?', [order_id, user_coupon_id]);
    let discount = 0;
    if (coupon.type === 1) {
      discount = coupon.discount_amount;
    } else if (coupon.type === 2) {
      discount = Math.round(order_amount * (1 - coupon.discount_amount / 10));
    } else {
      discount = coupon.discount_amount;
    }
    return { discount };
  }

  async getPoints(userId) {
    const [users] = await this.pool.query('SELECT points FROM users WHERE id = ?', [userId]);
    if (users.length === 0) throw Object.assign(new Error('User not found'), { httpStatus: 404 });
    return { points: users[0].points };
  }

  async addPoints(userId, body) {
    const { points, type, description, relatedId } = body;
    if (!points || !type) throw Object.assign(new Error('points and type required'), { httpStatus: 400 });
    await this.pool.query('UPDATE users SET points = points + ? WHERE id = ?', [points, userId]);
    await this.pool.query(
      'INSERT INTO points_logs (user_id, points, type, description, related_id) VALUES (?, ?, ?, ?, ?)',
      [userId, points, type, description || '', relatedId || null]
    );
    const [users] = await this.pool.query('SELECT points FROM users WHERE id = ?', [userId]);
    return { points: users[0].points };
  }

  async consumePoints(userId, body) {
    const { points, type, relatedId } = body;
    if (!points || points <= 0) throw Object.assign(new Error('points must be greater than 0'), { httpStatus: 400 });
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.execute('SELECT points FROM users WHERE id = ? FOR UPDATE', [userId]);
      if (users.length === 0) {
        await connection.rollback();
        throw Object.assign(new Error('User not found'), { httpStatus: 404 });
      }
      if (users[0].points < points) {
        await connection.rollback();
        throw Object.assign(new Error('No fields to update'), { httpStatus: 400 });
      }
      await connection.execute('UPDATE users SET points = points - ? WHERE id = ?', [points, userId]);
      await connection.execute(
        'INSERT INTO points_logs (user_id, points, type, related_id) VALUES (?, ?, ?, ?)',
        [userId, -points, type || 'consume', relatedId || null]
      );
      await connection.commit();
      const [newBalance] = await this.pool.execute('SELECT points FROM users WHERE id = ?', [userId]);
      return { points: newBalance[0].points };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  async getPointsLogs(userId, query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const [rows] = await this.pool.query(
      'SELECT * FROM points_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset]
    );
    const [[{ count }]] = await this.pool.query('SELECT COUNT(*) as count FROM points_logs WHERE user_id = ?', [userId]);
    return { list: rows, pagination: formatPagination(page, pageSize, count) };
  }

  async applyMerchant(body) {
    const { name, contact_name, contact_phone, business_license, description, address } = body;
    if (!name || !contact_name || !contact_phone) throw Object.assign(new Error('merchant contact fields required'), { httpStatus: 400 });
    const [result] = await this.pool.query(
      'INSERT INTO merchants (name, contact_name, contact_phone, business_license, description, address, status) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [name, contact_name, contact_phone, business_license || '', description || '', address || '']
    );
    return { id: result.insertId };
  }

  async getMerchantInfo(merchantId) {
    if (!merchantId) throw Object.assign(new Error('merchantId required'), { httpStatus: 404 });
    const [rows] = await this.pool.query('SELECT * FROM merchants WHERE id = ?', [merchantId]);
    if (rows.length === 0) throw Object.assign(new Error('Merchant not found'), { httpStatus: 404 });
    return rows[0];
  }

  async getMerchantProducts(merchantId, query) {
    if (!merchantId) throw Object.assign(new Error('merchantId required'), { httpStatus: 404 });
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const [rows] = await this.pool.query(
      'SELECT * FROM products WHERE merchant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [merchantId, pageSize, offset]
    );
    resolveUserProductAssets(rows);
    const [[{ count }]] = await this.pool.query('SELECT COUNT(*) as count FROM products WHERE merchant_id = ?', [merchantId]);
    return { list: rows, pagination: formatPagination(page, pageSize, count) };
  }
}

const userService = new UserService();

module.exports = {
  userService,
  formatUserAddressList,
  resolveUserProductAssets,
};
