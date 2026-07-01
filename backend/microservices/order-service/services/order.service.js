const mysql = require('mysql2/promise');
const { buildOrderItem } = require('../order-utils');
const { resolveAssetUrl } = require('../../shared/asset-url');
const { createPaymentTransaction } = require('../payment-provider');
const { processVerifiedPaymentCallback } = require('../payment-callback-processor');
const { processVerifiedRefundCallback } = require('../refund-callback-processor');
const { expirePendingOrders } = require('../order-timeout-processor');
const { createRefundRequest, transitionRefundRequest } = require('../refund-processor');
const { createRefundEvidenceUploadIntent } = require('../refund-evidence-upload');
const { syncTracking } = require('../logistics-provider');

function resolveRefundEvidenceRetentionDays(body = {}) {
  const rawValue = body.retentionDays || body.retention_days || process.env.REFUND_EVIDENCE_RETENTION_DAYS || 180;
  const days = Number(rawValue);
  if (!Number.isInteger(days) || days <= 0) {
    throw Object.assign(new Error('retentionDays must be a positive integer'), { httpStatus: 400 });
  }
  return days;
}

function resolveRefundEvidenceRetentionPolicy(body = {}) {
  return String(body.retentionPolicy || body.retention_policy || 'standard').trim() || 'standard';
}

class OrderService {
  constructor(pool) {
    this.pool = pool || mysql.createPool({
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
          product_image: resolveAssetUrl(row.product_image),
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
    const transaction = await createPaymentTransaction({
      orderId,
      orderNo: orders[0].order_no,
      amount: orders[0].total_amount,
      paymentMethod,
    });
    await this.pool.query("UPDATE orders SET status = 'paid', payment_method = ?, paid_at = NOW() WHERE id = ?", [paymentMethod, orderId]);
    return { orderId, amount: orders[0].total_amount, paymentMethod, transactionId: transaction.transactionId, provider: transaction.provider };
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

  async applyPaymentCallback(callback) {
    const conn = await this.pool.getConnection();
    try {
      return await processVerifiedPaymentCallback(conn, callback);
    } finally {
      conn.release();
    }
  }

  async applyRefundCallback(callback) {
    const conn = await this.pool.getConnection();
    try {
      return await processVerifiedRefundCallback(conn, callback);
    } finally {
      conn.release();
    }
  }

  async expirePendingOrders(options) {
    const conn = await this.pool.getConnection();
    try {
      return await expirePendingOrders(conn, options);
    } finally {
      conn.release();
    }
  }

  async requestRefund(userId, body) {
    const conn = await this.pool.getConnection();
    try {
      return await createRefundRequest(conn, userId, body);
    } finally {
      conn.release();
    }
  }

  async addRefundEvidence(userId, refundId, body = {}) {
    const url = String(body.url || body.evidenceUrl || '').trim();
    const evidenceType = String(body.type || body.evidenceType || 'image').trim().toLowerCase();
    const description = String(body.description || body.note || '').trim();
    const objectKey = String(body.objectKey || body.object_key || '').trim();
    const contentType = String(body.contentType || body.content_type || '').trim().toLowerCase();
    const fileSize = Number(body.fileSize || body.file_size || 0);
    const checksum = String(body.checksum || '').trim();
    const retentionPolicy = resolveRefundEvidenceRetentionPolicy(body);
    const retentionDays = resolveRefundEvidenceRetentionDays(body);
    const allowedTypes = new Set(['image', 'video', 'document']);

    if (!url) throw Object.assign(new Error('evidence url required'), { httpStatus: 400 });
    if (!allowedTypes.has(evidenceType)) throw Object.assign(new Error(`Unsupported evidence type: ${evidenceType}`), { httpStatus: 400 });
    if (fileSize && (!Number.isFinite(fileSize) || fileSize < 0)) throw Object.assign(new Error('fileSize must be a positive number'), { httpStatus: 400 });

    const [refunds] = await this.pool.query(
      'SELECT id FROM refund_requests WHERE id = ? AND user_id = ?',
      [refundId, userId]
    );
    if (refunds.length === 0) throw Object.assign(new Error('Refund request not found'), { httpStatus: 404 });

    const [result] = await this.pool.query(
      `INSERT INTO refund_evidence
       (refund_id, user_id, evidence_type, url, description, object_key, content_type, file_size, checksum, scan_status, scan_result, retention_policy, retention_days, retention_expires_at, cleanup_eligible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), 0)`,
      [refundId, userId, evidenceType, url, description, objectKey, contentType, fileSize || 0, checksum, 'pending', '', retentionPolicy, retentionDays, retentionDays]
    );

    return { evidenceId: result.insertId, refundId: Number(refundId) };
  }

  async createRefundEvidenceUploadIntent(userId, refundId, body = {}) {
    const [refunds] = await this.pool.query(
      'SELECT id FROM refund_requests WHERE id = ? AND user_id = ?',
      [refundId, userId]
    );
    if (refunds.length === 0) throw Object.assign(new Error('Refund request not found'), { httpStatus: 404 });

    return createRefundEvidenceUploadIntent({
      refundId,
      userId,
      fileName: body.fileName || body.filename,
      contentType: body.contentType || body.mimeType,
      fileSize: body.fileSize || body.size,
    });
  }

  async updateRefundEvidenceScan(operator, evidenceId, body = {}) {
    const operatorContext = typeof operator === 'object' ? operator : { userId: operator };
    const scanStatus = String(body.status || body.scanStatus || '').trim().toLowerCase();
    const scanResult = String(body.result || body.scanResult || '').trim();
    const scannedAt = body.scannedAt || body.scanned_at || null;
    const allowedStatuses = new Set(['pending', 'passed', 'failed', 'quarantined']);

    if (!operatorContext.userId) throw Object.assign(new Error('operatorId required'), { httpStatus: 400 });
    if (!allowedStatuses.has(scanStatus)) throw Object.assign(new Error(`Unsupported evidence scan status: ${scanStatus}`), { httpStatus: 400 });

    const [rows] = await this.pool.query(
      'SELECT id, refund_id FROM refund_evidence WHERE id = ?',
      [evidenceId]
    );
    if (rows.length === 0) throw Object.assign(new Error('Refund evidence not found'), { httpStatus: 404 });

    if (body.idempotencyKey) {
      const [insertResult] = await this.pool.query(
        `INSERT INTO refund_evidence_scan_callback_records
         (idempotency_key, evidence_id, scan_status, scan_result, raw_payload)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE duplicate_count = duplicate_count + 1, updated_at = CURRENT_TIMESTAMP`,
        [body.idempotencyKey, evidenceId, scanStatus, scanResult, JSON.stringify(body.rawPayload || {})]
      );
      if (insertResult.affectedRows !== 1) {
        return { evidenceId: Number(evidenceId), refundId: rows[0].refund_id, scanStatus, scanResult, duplicate: true };
      }
    }

    if (scannedAt) {
      await this.pool.query(
        'UPDATE refund_evidence SET scan_status = ?, scan_result = ?, scanned_at = ? WHERE id = ?',
        [scanStatus, scanResult, scannedAt, evidenceId]
      );
    } else {
      await this.pool.query(
        'UPDATE refund_evidence SET scan_status = ?, scan_result = ?, scanned_at = NOW() WHERE id = ?',
        [scanStatus, scanResult, evidenceId]
      );
    }
    await this.recordOperationLog(operatorContext, {
      action: 'evidence.scan.updated',
      targetType: 'refund_evidence',
      targetId: evidenceId,
      metadata: { refundId: rows[0].refund_id, scanStatus, scanResult, scannedAt: scannedAt || null },
    });

    return { evidenceId: Number(evidenceId), refundId: rows[0].refund_id, scanStatus, scanResult };
  }

  async reviewRefund(operator, refundId, body) {
    const conn = await this.pool.getConnection();
    try {
      const operatorContext = typeof operator === 'object' ? operator : { userId: operator };
      const result = await transitionRefundRequest(conn, {
        refundId,
        nextStatus: body?.status,
        operatorId: operatorContext.userId,
        operatorRole: operatorContext.role,
        merchantId: operatorContext.merchantId,
        note: body?.note || '',
        evidenceScanBypass: body?.evidenceScanBypass === true,
      });
      await conn.execute(
        `INSERT INTO operation_logs (operator_id, operator_role, merchant_id, action, target_type, target_id, metadata)
         VALUES (?, ?, ?, 'refund.review.updated', 'refund_request', ?, CAST(? AS JSON))`,
        [
          operatorContext.userId || null,
          operatorContext.role || '',
          operatorContext.merchantId || null,
          String(refundId),
          JSON.stringify({
            status: result.status,
            operatorRole: operatorContext.role || '',
            merchantId: operatorContext.merchantId || null,
            evidenceScanBypass: body?.evidenceScanBypass === true,
            notePresent: Boolean(String(body?.note || '').trim()),
          }),
        ]
      );
      return result;
    } finally {
      conn.release();
    }
  }

  buildRefundScope(operator, baseParams = []) {
    const operatorContext = typeof operator === 'object' ? operator : { userId: operator };
    const role = String(operatorContext.role || 'customer').toLowerCase();
    if (role !== 'merchant') return { operatorContext, scopeSql: '', params: baseParams };
    if (!operatorContext.merchantId) {
      throw Object.assign(new Error('merchantId required for merchant refund list'), { httpStatus: 403 });
    }
    return {
      operatorContext,
      scopeSql: ' AND p.merchant_id = ?',
      params: [...baseParams, operatorContext.merchantId],
    };
  }

  async listRefunds(operator, query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    const where = [];
    const params = [];

    if (query.status) {
      where.push('rr.status = ?');
      params.push(query.status);
    }

    if (query.keyword) {
      where.push('(rr.order_no LIKE ? OR rr.reason LIKE ?)');
      const keyword = `%${String(query.keyword).trim()}%`;
      params.push(keyword, keyword);
    }

    const wherePrefix = where.length ? `WHERE ${where.join(' AND ')}` : 'WHERE 1 = 1';
    const { scopeSql, params: scopedParams } = this.buildRefundScope(operator, params);
    const baseFrom = `FROM refund_requests rr
      INNER JOIN orders o ON rr.order_id = o.id
      INNER JOIN order_items oi ON oi.order_id = o.id
      INNER JOIN products p ON p.id = oi.product_id
      ${wherePrefix}${scopeSql}`;

    const [rows] = await this.pool.query(
      `SELECT DISTINCT rr.id, rr.order_id, rr.order_no, rr.user_id, rr.refund_type, rr.amount, rr.reason, rr.status,
              rr.provider, rr.provider_refund_id, rr.failed_reason, rr.created_at, rr.updated_at, rr.processed_at,
              o.total_amount, o.status AS order_status
       ${baseFrom}
       ORDER BY rr.created_at DESC LIMIT ? OFFSET ?`,
      [...scopedParams, pageSize, offset]
    );
    const [[{ count }]] = await this.pool.query(`SELECT COUNT(DISTINCT rr.id) AS count ${baseFrom}`, scopedParams);

    return {
      list: rows,
      pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
    };
  }

  buildFulfillmentScope(operator, baseParams = []) {
    const operatorContext = typeof operator === 'object' ? operator : { userId: operator };
    const role = String(operatorContext.role || 'customer').toLowerCase();
    if (role !== 'merchant') return { scopeSql: '', params: baseParams };
    if (!operatorContext.merchantId) {
      throw Object.assign(new Error('merchantId required for fulfillment order list'), { httpStatus: 403 });
    }
    return { scopeSql: ' AND p.merchant_id = ?', params: [...baseParams, operatorContext.merchantId] };
  }

  formatFulfillmentOrders(rows, page, pageSize, total) {
    const orderMap = {};
    for (const row of rows) {
      if (!orderMap[row.id]) {
        orderMap[row.id] = {
          id: row.id,
          order_no: row.order_no,
          user_id: row.user_id,
          total_amount: row.total_amount,
          status: row.status,
          created_at: row.created_at,
          tracking_company: row.tracking_company,
          tracking_number: row.tracking_number,
          tracking_status: row.tracking_status,
          items: [],
        };
      }
      if (row.product_name) {
        orderMap[row.id].items.push({ product_name: row.product_name, quantity: row.quantity });
      }
    }
    return { list: Object.values(orderMap), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async listFulfillmentOrders(operator, query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    const status = String(query.status || 'paid').trim().toLowerCase();
    const allowedStatuses = new Set(['paid', 'shipped', 'completed']);
    if (!allowedStatuses.has(status)) throw Object.assign(new Error(`Unsupported fulfillment status: ${status}`), { httpStatus: 400 });

    const where = ['o.status = ?'];
    const params = [status];
    if (query.keyword) {
      where.push('(o.order_no LIKE ? OR oi.product_name LIKE ?)');
      const keyword = `%${String(query.keyword).trim()}%`;
      params.push(keyword, keyword);
    }

    const { scopeSql, params: scopedParams } = this.buildFulfillmentScope(operator, params);
    const baseFrom = `FROM orders o
      INNER JOIN order_items oi ON oi.order_id = o.id
      INNER JOIN products p ON p.id = oi.product_id
      LEFT JOIN logistics_tracking lt ON lt.order_id = o.id
      WHERE ${where.join(' AND ')}${scopeSql}`;

    const [rows] = await this.pool.query(
      `SELECT o.id, o.order_no, o.user_id, o.total_amount, o.status, o.created_at,
              lt.tracking_company, lt.tracking_number, lt.status AS tracking_status,
              oi.product_name, oi.quantity
       ${baseFrom}
       ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...scopedParams, pageSize, offset]
    );
    const [[{ count }]] = await this.pool.query(`SELECT COUNT(DISTINCT o.id) AS count ${baseFrom}`, scopedParams);

    return this.formatFulfillmentOrders(rows, page, pageSize, count);
  }

  async getRefundEvidenceRetentionCleanupDryRun(query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    const where = 'WHERE re.cleanup_eligible = 1 AND re.retention_expires_at <= NOW()';

    const [rows] = await this.pool.query(
      `SELECT re.id, re.refund_id, re.user_id, re.evidence_type, re.url, re.object_key, re.content_type,
              re.file_size, re.checksum, re.scan_status, re.retention_policy, re.retention_days,
              re.retention_expires_at, re.cleanup_eligible, rr.status AS refund_status, rr.order_no
       FROM refund_evidence re
       INNER JOIN refund_requests rr ON rr.id = re.refund_id
       ${where}
       ORDER BY re.retention_expires_at ASC, re.id ASC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    const [[{ count }]] = await this.pool.query(`SELECT COUNT(*) AS count FROM refund_evidence re INNER JOIN refund_requests rr ON rr.id = re.refund_id ${where}`);

    return {
      list: rows.map((row) => ({ ...row, proposedAction: 'retain-review' })),
      pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
    };
  }

  async runRefundEvidenceRetentionCleanupDryRun(options = {}) {
    const dryRun = options.dryRun !== false;
    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 50, 1), 500);
    const operator = options.operator || { userId: null, role: 'system' };
    const report = await this.getRefundEvidenceRetentionCleanupDryRun({ page: 1, pageSize: limit });
    const candidateCount = report.pagination.total;
    const metadata = {
      dryRun,
      limit,
      candidateIds: report.list.map((item) => item.id),
      proposedAction: 'retain-review',
    };
    const [result] = await this.pool.query(
      `INSERT INTO retention_cleanup_runs (mode, status, candidate_count, deleted_count, metadata)
       VALUES (?, 'completed', ?, 0, CAST(? AS JSON))`,
      [dryRun ? 'dry_run' : 'disabled', candidateCount, JSON.stringify(metadata)]
    );
    await this.recordOperationLog(operator, {
      action: 'retention.cleanup.dry_run',
      targetType: 'retention_cleanup_run',
      targetId: result.insertId,
      metadata,
    });
    return { runId: result.insertId, dryRun, candidateCount, deletedCount: 0, status: 'dry_run' };
  }

  async exportRefundsPlaceholder(operator, query = {}) {
    const result = await this.listRefunds(operator, { ...query, page: 1, pageSize: 100 });
    return {
      status: 'placeholder',
      format: query.format || 'csv',
      total: result.pagination.total,
      generated: false,
      message: 'Refund export is reserved for operations workflow hardening; no file is generated locally yet.',
      filters: {
        status: query.status || '',
        keyword: query.keyword || '',
      },
    };
  }

  async recordOperationLog(operator, { action, targetType, targetId = '', metadata = {} }) {
    const operatorContext = typeof operator === 'object' ? operator : { userId: operator };
    const [result] = await this.pool.query(
      `INSERT INTO operation_logs (operator_id, operator_role, merchant_id, action, target_type, target_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
      [
        operatorContext.userId || null,
        operatorContext.role || '',
        operatorContext.merchantId || null,
        action,
        targetType,
        String(targetId || ''),
        JSON.stringify(metadata || {}),
      ]
    );
    return { id: result.insertId, action, targetType, targetId: String(targetId || '') };
  }

  async createExportJobPlaceholder(operator, body = {}) {
    const operatorContext = typeof operator === 'object' ? operator : { userId: operator };
    const exportType = String(body.exportType || body.export_type || '').trim().toLowerCase();
    const allowedTypes = new Set(['refunds', 'orders', 'permission_audits', 'operation_logs']);
    if (!allowedTypes.has(exportType)) throw Object.assign(new Error(`Unsupported export type: ${exportType}`), { httpStatus: 400 });
    const filters = body.filters && typeof body.filters === 'object' ? body.filters : {};
    const message = 'Export job recorded locally; file generation is not enabled yet.';
    const [result] = await this.pool.query(
      `INSERT INTO export_jobs (export_type, status, requested_by, requester_role, merchant_id, filters, file_url, message)
       VALUES (?, 'placeholder', ?, ?, ?, CAST(? AS JSON), '', ?)`,
      [exportType, operatorContext.userId || null, operatorContext.role || '', operatorContext.merchantId || null, JSON.stringify(filters), message]
    );
    await this.recordOperationLog(operatorContext, {
      action: 'export.requested',
      targetType: 'export_job',
      targetId: result.insertId,
      metadata: { exportType, filters, generated: false },
    });
    return { id: result.insertId, exportType, status: 'placeholder', generated: false, fileUrl: '', message };
  }

  buildOperationsScope(operator, baseWhere = [], baseParams = []) {
    const operatorContext = typeof operator === 'object' ? operator : { userId: operator };
    const role = String(operatorContext.role || 'customer').toLowerCase();
    if (role !== 'merchant') return { where: baseWhere, params: baseParams };
    if (!operatorContext.merchantId) throw Object.assign(new Error('merchantId required for operation scope'), { httpStatus: 403 });
    return { where: [...baseWhere, 'merchant_id = ?'], params: [...baseParams, operatorContext.merchantId] };
  }

  async listExportJobs(operator, query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    const where = [];
    const params = [];
    if (query.exportType || query.export_type) {
      where.push('export_type = ?');
      params.push(String(query.exportType || query.export_type).trim().toLowerCase());
    }
    const scoped = this.buildOperationsScope(operator, where, params);
    const whereSql = scoped.where.length ? `WHERE ${scoped.where.join(' AND ')}` : '';
    const [rows] = await this.pool.query(
      `SELECT id, export_type, status, requested_by, requester_role, merchant_id, filters, file_url, message, created_at, updated_at
       FROM export_jobs ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...scoped.params, pageSize, offset]
    );
    const [[{ count }]] = await this.pool.query(`SELECT COUNT(*) AS count FROM export_jobs ${whereSql}`, scoped.params);
    return { list: rows, pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) } };
  }

  async listOperationLogs(operator, query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    const where = [];
    const params = [];
    if (query.action) {
      where.push('action = ?');
      params.push(String(query.action).trim());
    }
    const scoped = this.buildOperationsScope(operator, where, params);
    const whereSql = scoped.where.length ? `WHERE ${scoped.where.join(' AND ')}` : '';
    const [rows] = await this.pool.query(
      `SELECT id, operator_id, operator_role, merchant_id, action, target_type, target_id, metadata, created_at
       FROM operation_logs ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...scoped.params, pageSize, offset]
    );
    const [[{ count }]] = await this.pool.query(`SELECT COUNT(*) AS count FROM operation_logs ${whereSql}`, scoped.params);
    return { list: rows, pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) } };
  }

  async getRefund(operator, refundId) {
    const { operatorContext } = this.buildRefundScope(operator);
    const [refunds] = await this.pool.query(
      `SELECT rr.id, rr.order_id, rr.order_no, rr.user_id, rr.refund_type, rr.amount, rr.reason, rr.status,
              rr.provider, rr.provider_refund_id, rr.failed_reason, rr.created_at, rr.updated_at, rr.processed_at,
              o.total_amount, o.status AS order_status, o.payment_method, o.paid_at, o.shipping_address
       FROM refund_requests rr
       INNER JOIN orders o ON rr.order_id = o.id
       WHERE rr.id = ?`,
      [refundId]
    );
    if (refunds.length === 0) throw Object.assign(new Error('Refund request not found'), { httpStatus: 404 });

    const refund = refunds[0];
    const [items] = await this.pool.query(
      `SELECT oi.product_id, oi.product_name, oi.product_image, oi.quantity, oi.price, oi.subtotal, p.merchant_id
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [refund.order_id]
    );

    if (String(operatorContext.role || '').toLowerCase() === 'merchant') {
      if (items.length === 0 || items.some((item) => Number(item.merchant_id) !== Number(operatorContext.merchantId))) {
        throw Object.assign(new Error('Refund request does not belong to merchant'), { httpStatus: 403 });
      }
    }

    const [events] = await this.pool.query(
      'SELECT from_status, to_status, operator_id, note, created_at FROM refund_events WHERE refund_id = ? ORDER BY created_at ASC',
      [refundId]
    );

    const [evidence] = await this.pool.query(
      'SELECT id, evidence_type, url, description, object_key, content_type, file_size, checksum, scan_status, scan_result, scanned_at, retention_policy, retention_days, retention_expires_at, cleanup_eligible, created_at FROM refund_evidence WHERE refund_id = ? ORDER BY created_at ASC',
      [refundId]
    );

    return { ...refund, items, events, evidence };
  }

  async shipOrder(operator, orderId, body) {
    const trackingCompany = body?.trackingCompany || body?.tracking_company || '';
    const trackingNumber = body?.trackingNumber || body?.tracking_number;
    if (!trackingNumber) throw Object.assign(new Error('trackingNumber required'), { httpStatus: 400 });

    const operatorContext = typeof operator === 'object' ? operator : { userId: operator };
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const [orders] = await conn.execute('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      if (orders.length === 0) throw Object.assign(new Error('Order not found'), { httpStatus: 404 });
      const order = orders[0];
      if (order.status !== 'paid') {
        throw Object.assign(new Error(`Order status ${order.status} cannot be shipped`), { httpStatus: 400 });
      }

      if (operatorContext.role === 'merchant') {
        if (!operatorContext.merchantId) throw Object.assign(new Error('merchantId required for merchant shipping'), { httpStatus: 403 });
        const [scopeRows] = await conn.execute(
          `SELECT COUNT(DISTINCT p.merchant_id) AS merchant_count,
                  SUM(CASE WHEN p.merchant_id = ? THEN 0 ELSE 1 END) AS unmatched_count
           FROM order_items oi
           INNER JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = ?`,
          [operatorContext.merchantId, orderId]
        );
        const scope = scopeRows[0] || { merchant_count: 0, unmatched_count: 0 };
        if (Number(scope.merchant_count) !== 1 || Number(scope.unmatched_count) !== 0) {
          throw Object.assign(new Error('Merchant cannot ship orders containing products outside own scope'), { httpStatus: 403 });
        }
      }

      await conn.execute("UPDATE orders SET status = 'shipped' WHERE id = ? AND status = 'paid'", [orderId]);
      const [trackings] = await conn.execute('SELECT id FROM logistics_tracking WHERE order_id = ? FOR UPDATE', [orderId]);
      if (trackings.length > 0) {
        await conn.execute(
          "UPDATE logistics_tracking SET tracking_company = ?, tracking_number = ?, status = 'shipped', shipped_at = COALESCE(shipped_at, NOW()) WHERE order_id = ?",
          [trackingCompany, trackingNumber, orderId]
        );
      } else {
        await conn.execute(
          "INSERT INTO logistics_tracking (order_id, tracking_company, tracking_number, status, shipped_at) VALUES (?, ?, ?, 'shipped', NOW())",
          [orderId, trackingCompany, trackingNumber]
        );
      }
      await conn.execute(
        `INSERT INTO operation_logs (operator_id, operator_role, merchant_id, action, target_type, target_id, metadata)
         VALUES (?, ?, ?, 'shipment.updated', 'order', ?, CAST(? AS JSON))`,
        [
          operatorContext.userId || null,
          operatorContext.role || '',
          operatorContext.merchantId || null,
          String(orderId),
          JSON.stringify({ trackingCompany, trackingNumber, status: 'shipped' }),
        ]
      );
      await conn.commit();
      await syncTracking({ orderId, trackingCompany, trackingNumber });
      return { orderId: Number(orderId), status: 'shipped', trackingCompany, trackingNumber };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
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

module.exports = { OrderService, orderService, formatOrderList: OrderService.prototype.formatOrderList };
