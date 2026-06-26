const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

// 商品列表（分页、筛选、搜索）
async function getProductList(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const keyword = req.query.keyword || '';
    const categoryId = req.query.categoryId || null;
    const allowedSortFields = ['created_at', 'price', 'sales', 'stock', 'name'];
    const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const offset = (page - 1) * pageSize;

    let whereClauses = ['p.status = 1'];
    let params = [];

    if (keyword) {
      whereClauses.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (categoryId) {
      whereClauses.push('p.category_id = ?');
      params.push(categoryId);
    }

    const whereSql = whereClauses.join(' AND ');

    const [products] = await mysqlPool.execute(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE ${whereSql} 
       ORDER BY p.${sortBy} ${sortOrder} 
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const [[{ count }]] = await mysqlPool.execute(
      `SELECT COUNT(*) as count FROM products p WHERE ${whereSql}`,
      params
    );

    sendRes(res, {
      list: products,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (err) {
    console.error('获取商品列表错误:', err);
    sendError(res, '获取商品列表失败', 500);
  }
}

// 商品详情
async function getProductDetail(req, res) {
  try {
    const { id } = req.params;

    const [products] = await mysqlPool.execute(
      `SELECT p.*, c.name as category_name, c.id as category_id
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ? AND p.status = 1`,
      [id]
    );

    if (products.length === 0) {
      return sendError(res, '商品不存在', 404);
    }

    // 获取商品图片
    const [images] = await mysqlPool.execute(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order',
      [id]
    );

    products[0].images = images;
    sendRes(res, products[0]);
  } catch (err) {
    console.error('获取商品详情错误:', err);
    sendError(res, '获取商品详情失败', 500);
  }
}

// 创建商品（管理员）
async function createProduct(req, res) {
  try {
    const { name, description, price, stock, category_id, brand, spec } = req.body;
    const images = req.files ? req.files.map((f) => f.filename) : [];

    if (!name || !price || !stock || !category_id) {
      return sendError(res, '商品名称、价格、库存、分类不能为空', 400);
    }

    const result = await mysqlPool.execute(
      `INSERT INTO products (name, description, price, stock, category_id, brand, spec, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [name, description || '', price, stock, category_id, brand || '', spec || '']
    );

    const productId = result.insertId;

    // 保存商品图片
    if (images.length > 0) {
      const placeholders = images.map(() => '(?, ?, ?)').join(', ');
      const imageParams = [];
      images.forEach((img, idx) => {
        imageParams.push(productId, img, idx);
      });
      await mysqlPool.execute(
        'INSERT INTO product_images (product_id, image_url, sort_order) VALUES ' + placeholders,
        imageParams
      );
    }

    const [products] = await mysqlPool.execute('SELECT * FROM products WHERE id = ?', [productId]);
    sendRes(res, products[0], '商品创建成功');
  } catch (err) {
    console.error('创建商品错误:', err);
    sendError(res, '创建商品失败', 500);
  }
}

// 更新商品
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category_id, brand, spec, status } = req.body;

    const fields = [];
    const params = [];

    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (price !== undefined) { fields.push('price = ?'); params.push(price); }
    if (stock !== undefined) { fields.push('stock = ?'); params.push(stock); }
    if (category_id !== undefined) { fields.push('category_id = ?'); params.push(category_id); }
    if (brand !== undefined) { fields.push('brand = ?'); params.push(brand); }
    if (spec !== undefined) { fields.push('spec = ?'); params.push(spec); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }

    if (fields.length === 0) {
      return sendError(res, '没有需要更新的字段', 400);
    }

    params.push(id);

    await mysqlPool.execute(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    sendRes(res, null, '商品更新成功');
  } catch (err) {
    console.error('更新商品错误:', err);
    sendError(res, '更新商品失败', 500);
  }
}

// 删除商品
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    await mysqlPool.execute('UPDATE products SET status = 0 WHERE id = ?', [id]);
    sendRes(res, null, '商品已下架');
  } catch (err) {
    console.error('删除商品错误:', err);
    sendError(res, '删除商品失败', 500);
  }
}

// 热门推荐商品
async function getHotProducts(req, res) {
  try {
    const [products] = await mysqlPool.execute(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.status = 1 
       ORDER BY p.sales DESC 
       LIMIT 10`
    );
    sendRes(res, products);
  } catch (err) {
    sendError(res, '获取推荐商品失败', 500);
  }
}

module.exports = {
  getProductList,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  getHotProducts,
};


