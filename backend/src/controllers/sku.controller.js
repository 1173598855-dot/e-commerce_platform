const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

// 获取商品SKU规格选项
async function getSkuOptions(req, res) {
  try {
    const { id } = req.params;
    const [options] = await mysqlPool.execute(
      'SELECT * FROM product_spec_options WHERE product_id = ? ORDER BY sort_order, spec_name',
      [id]
    );

    // 按规格名分组
    const specMap = {};
    options.forEach(opt => {
      if (!specMap[opt.spec_name]) {
        specMap[opt.spec_name] = [];
      }
      specMap[opt.spec_name].push(opt.spec_value);
    });

    sendRes(res, specMap);
  } catch (err) {
    sendError(res, '获取规格失败', 500);
  }
}

// 获取商品所有SKU
async function getSkus(req, res) {
  try {
    const { id } = req.params;
    const [skus] = await mysqlPool.execute(
      'SELECT * FROM product_skus WHERE product_id = ? AND status = 1 ORDER BY price',
      [id]
    );
    sendRes(res, skus);
  } catch (err) {
    sendError(res, '获取SKU失败', 500);
  }
}

// 根据规格组合获取SKU
async function getSkuBySpec(req, res) {
  try {
    const { id } = req.params;
    const { specs } = req.body; // { "颜色": "红色", "尺寸": "XL" }

    if (!specs || Object.keys(specs).length === 0) {
      return sendError(res, '请提供规格参数', 400);
    }

    const conditions = [];
    const params = [id];

    for (const [name, value] of Object.entries(specs)) {
      conditions.push('(product_id = ? AND spec_name = ? AND spec_value = ?)');
      params.push(id, name, value);
    }

    const [options] = await mysqlPool.execute(
      `SELECT product_id FROM product_spec_options WHERE ${conditions.join(' OR ')}`,
      params
    );

    // 提取唯一的 product_id
    const productIds = [...new Set(options.map(o => o.product_id))];

    if (productIds.length === 0) {
      return sendError(res, '未找到匹配的SKU', 404);
    }

    const [skus] = await mysqlPool.execute(
      'SELECT * FROM product_skus WHERE product_id = ? AND sku_code IN (?)',
      [productIds[0], productIds]
    );

    sendRes(res, skus[0] || null);
  } catch (err) {
    sendError(res, '查询SKU失败', 500);
  }
}

// 创建SKU（管理员）
async function createSku(req, res) {
  try {
    const { product_id, sku_code, spec, price, stock, image } = req.body;

    const result = await mysqlPool.execute(
      'INSERT INTO product_skus (product_id, sku_code, spec, price, stock, image) VALUES (?, ?, ?, ?, ?, ?)',
      [product_id, sku_code, JSON.stringify(spec), price, stock, image || '']
    );

    sendRes(res, { id: result.insertId }, 'SKU创建成功');
  } catch (err) {
    sendError(res, '创建SKU失败', 500);
  }
}

// 创建SKU规格选项（管理员）
async function createSpecOptions(req, res) {
  try {
    const { product_id, spec_name, spec_values, sort_order = 0 } = req.body;

    if (!product_id || !spec_name || !spec_values || !Array.isArray(spec_values)) {
      return sendError(res, '参数不完整', 400);
    }

    const values = spec_values.map((value, index) => [
      product_id, spec_name, value, sort_order + index
    ]);

    await mysqlPool.execute(
      'INSERT INTO product_spec_options (product_id, spec_name, spec_value, sort_order) VALUES ?',
      [values]
    );

    sendRes(res, null, '规格选项创建成功');
  } catch (err) {
    sendError(res, '创建规格选项失败', 500);
  }
}

module.exports = {
  getSkuOptions,
  getSkus,
  getSkuBySpec,
  createSku,
  createSpecOptions,
};
