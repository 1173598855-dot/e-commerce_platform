const mysql = require('mysql2/promise');
const { buildOrderItem } = require('../order-utils');

class OrderService {
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
    return { service: 'order-service', status: 'running' };
  }

  async getCart(userId) {
    const [items] = await this.pool.query(
      `SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image as product_image, p.stock
       FROM cart_items ci JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ? AND p.status = 1`, [userId]
    );
    const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    return { items, total: total.toFixed(2) };
  }

  async addToCart(userId, body) {
    const { product_id, quantity = 1 } = body;
    if (!product_id) throw Object.assign(new Error('product_id required'), { httpStatus: 400 });
    const [prods] = await this.pool.query('SELECT id, stock FROM products WHERE id = ? AND status = 1', [product_id]);
    if (prods.length === 0) throw Object.assign(new Error('Product not found'), { httpStatus: 404 });
    if (prods[0].stock < quantity) throw Object.assign(new Error('Insufficient stock'), { httpStatus: 400 });
    const [existing] = await this.pool.query('SELECT id FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, product_id]);
    if (existing.length > 0) {
      await this.pool.query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, existing[0].id]);
    } else {
      await this.pool.query('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', [userId, product_id, quantity]);
    }
    return null;
  }

  async updateCartItem(userId, id, body) {
    const { quantity } = body;
    if (!quantity || quantity < 1) throw Object.assign(new Error('quantity >= 1 required'), { httpStatus: 400 });
    const [rows] = await this.pool.query('SELECT id FROM cart_items WHERE id = ? AND user_id = ?', [id, userId]);
    if (rows.length === 0) throw Object.assign(new Error('Not found'), { httpStatus: 404 });
    await this.pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, id]);
    return null;
  }

  async deleteCartItem(userId, id) {
    const [rows] = await this.pool.query('SELECT id FROM cart_items WHERE id = ? AND user_id = ?', [id, userId]);
    if (rows.length === 0) throw Object.assign(new Error('Not found'), { httpStatus: 404 });
    await this.pool.query('DELETE FROM cart_items WHERE id = ?', [id]);
    return null;
  }

  async clearCart(userId) {
    await this.pool.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    return null;
  }

  async listOrders(userId, query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const status = query.status || '';
    let where = 'o.user_id = ?';
    const params = [userId];
    if (status) { where += ' AND o.status = ?'; params.push(status); }
    const [orders] = await this.pool.query(
      `SELECT o.*, oi.product_id, oi.quantity, oi.price as item_price, oi.subtotal,
              p.name as product_name, p.image as product_image
       FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id LEFT JOIN products p ON oi.product_id = p.id
       WHERE ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ count }]] = await this.pool.query(`SELECT COUNT(DISTINCT o.id) as count FROM orders o WHERE ${where}`, params);
    return this.formatOrderList(orders, page, pageSize, count);
  }

  formatOrderList(rows, page, pageSize, total) {
    const orderMap = {};
    for (const row of rows) {
      if (!orderMap[row.id]) {
        orderMap[row.id] = { id: row.id, order_no: row.order_no, total_amount: row.total_amount, status: row.status, created_at: row.created_at, items: [] };
      }
      if (row.product_name) {
        orderMap[row.id].items.push({
          product_id: row.product_id,
          product_name: row.product_name,
          product_image: row.product_image,
          quantity: row.quantity,
          price: row.item_price,
          subtotal: row.subtotal,
        });
      }
    }
    return { list: Object.values(orderMap), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async createOrder(userId, body) {
    const { items, shipping_address, remark } = body;
    if (!items || !Array.isArray(items) || items.length === 0) throw Object.assign(new Error('Items required'), { httpStatus: 400 });
    let totalAmount = 0;
    const orderItems = [];
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const item of items) {
        const [prods] = await conn.execute('SELECT name, image, price, stock FROM products WHERE id = ? AND status = 1 FOR UPDATE', [item.product_id]);
        if (prods.length === 0) throw new Error('Product not found: ' + item.product_id);
        const orderItem = buildOrderItem(item, prods[0]);
        if (prods[0].stock < orderItem.quantity) throw new Error('Insufficient stock for product ' + item.product_id);
        totalAmount += orderItem.subtotal;
        orderItems.push(orderItem);
        await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [orderItem.quantity, item.product_id]);
      }
      const orderNo = 'ORD' + Date.now() + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const [oR] = await conn.query(
        "INSERT INTO orders (order_no, user_id, total_amount, status, shipping_address, remark) VALUES (?, ?, ?, 'pending', ?, ?)",
        [orderNo, userId, totalAmount, shipping_address ? JSON.stringify(shipping_address) : null, remark || '']
      );
      const orderId = oR.insertId;
      for (const item of orderItems) {
        await conn.query('INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [orderId, item.product_id, item.product_name, item.product_image, item.quantity, item.price, item.subtotal]);
      }
      await conn.commit();
      return { orderId, orderNo, totalAmount: totalAmount.toFixed(2) };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async getOrder(userId, orderId) {
    const [orders] = await this.pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
    if (orders.length === 0) throw Object.assign(new Error('Not found'), { httpStatus: 404 });
    const [items] = await this.pool.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    orders[0].items = items;
    return orders[0];
  }

  async cancelOrder(userId, orderId) {
    const [orders] = await this.pool.query("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status IN ('pending','paid')", [orderId, userId]);
    if (orders.length === 0) throw Object.assign(new Error('Not found or wrong status'), { httpStatus: 400 });
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId]);
      const [items] = await conn.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
    return null;
  }

  async confirmOrder(userId, orderId) {
    const [orders] = await this.pool.query("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'shipped'", [orderId, userId]);
    if (orders.length === 0) throw Object.assign(new Error('Not found or wrong status'), { httpStatus: 400 });
    await this.pool.query("UPDATE orders SET status = 'completed', completed_at = NOW() WHERE id = ?", [orderId]);
    return null;
  }

  async mockPayment(userId, body) {
    const { orderId, paymentMethod = 'alipay' } = body;
    if (!orderId) throw Object.assign(new Error('orderId required'), { httpStatus: 400 });
    const [orders] = await this.pool.query("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'pending'", [orderId, userId]);
    if (orders.length === 0) throw Object.assign(new Error('Order not found or already paid'), { httpStatus: 404 });
    await new Promise((r) => setTimeout(r, 500));
    await this.pool.query("UPDATE orders SET status = 'paid', payment_method = ?, paid_at = NOW() WHERE id = ?", [paymentMethod, orderId]);
    return { orderId, amount: orders[0].total_amount, paymentMethod, transactionId: 'TXN' + Date.now() };
  }

  async paymentStatus(userId, orderId) {
    const [orders] = await this.pool.query('SELECT id, order_no, total_amount, status, payment_method, paid_at FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
    if (orders.length === 0) throw Object.assign(new Error('Not found'), { httpStatus: 404 });
    return orders[0];
  }

  async paymentHistory(userId, query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const [records] = await this.pool.query(
      "SELECT id, order_no, total_amount, status, payment_method, paid_at FROM orders WHERE user_id = ? AND status != 'pending' ORDER BY paid_at DESC LIMIT ? OFFSET ?",
      [userId, pageSize, offset]
    );
    const [[{ count }]] = await this.pool.query("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status != 'pending'", [userId]);
    return { list: records, pagination: { page, pageSize, total: count } };
  }

  async logistics(userId, orderId) {
    const [trackings] = await this.pool.query(
      'SELECT lt.id, lt.order_id, lt.tracking_company, lt.tracking_number, lt.status FROM logistics_tracking lt INNER JOIN orders o ON lt.order_id = o.id WHERE o.id = ? AND o.user_id = ?',
      [orderId, userId]
    );
    if (trackings.length === 0) throw Object.assign(new Error('No logistics info'), { httpStatus: 404 });
    const [traces] = await this.pool.query('SELECT content, location, created_at FROM logistics_traces WHERE tracking_id = ? ORDER BY created_at ASC', [trackings[0].id]);
    return { ...trackings[0], traces };
  }
}

const orderService = new OrderService();

module.exports = { orderService, formatOrderList: OrderService.prototype.formatOrderList };
