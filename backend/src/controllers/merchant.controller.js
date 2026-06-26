const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

// 商家入驻申请
async function applyMerchant(req, res) {
  try {
    const { name, contact_name, contact_phone, business_license, description, address } = req.body;

    if (!name || !contact_name || !contact_phone) {
      return sendError(res, '店铺名称、联系人和电话不能为空', 400);
    }

    const result = await mysqlPool.execute(
      'INSERT INTO merchants (name, contact_name, contact_phone, business_license, description, address, status) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [name, contact_name, contact_phone, business_license || '', description || '', address || '']
    );

    sendRes(res, { id: result.insertId }, '入驻申请已提交，等待审核');
  } catch (err) {
    console.error('入驻申请错误:', err);
    sendError(res, '申请失败', 500);
  }
}

// 获取商家信息
async function getMerchantInfo(req, res) {
  try {
    const merchantId = req.user.merchantId;
    if (!merchantId) {
      return sendError(res, '未关联商家信息', 404);
    }
    const [merchants] = await mysqlPool.execute('SELECT * FROM merchants WHERE id = ?', [merchantId]);
    
    if (merchants.length === 0) {
      return sendError(res, '商家不存在', 404);
    }

    sendRes(res, merchants[0]);
  } catch (err) {
    sendError(res, '获取商家信息失败', 500);
  }
}

// 获取商家商品列表
async function getMerchantProducts(req, res) {
  try {
    const merchantId = req.user.merchantId;
    if (!merchantId) {
      return sendError(res, '未关联商家信息', 404);
    }
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const [products] = await mysqlPool.execute(
      'SELECT * FROM products WHERE merchant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [merchantId, pageSize, offset]
    );

    const [[{ count }]] = await mysqlPool.execute(
      'SELECT COUNT(*) as count FROM products WHERE merchant_id = ?',
      [merchantId]
    );

    sendRes(res, { list: products, pagination: { page, pageSize, total: count } });
  } catch (err) {
    sendError(res, '获取商品列表失败', 500);
  }
}

module.exports = { applyMerchant, getMerchantInfo, getMerchantProducts };
