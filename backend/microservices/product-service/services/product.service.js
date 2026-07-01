const mysql = require('mysql2/promise');
const { resolveAssetList, resolveAssetUrl } = require('../../shared/asset-url');

function resolveProductAssets(products) {
  if (!Array.isArray(products)) return;
  products.forEach((product) => {
    product.image = resolveAssetUrl(product.image);
    product.product_image = resolveAssetUrl(product.product_image);
    product.avatar = resolveAssetUrl(product.avatar);
    product.images = resolveAssetList(product.images);
  });
}

class ProductService {
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
    return { service: 'product-service', status: 'running' };
  }

  async list(query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    const keyword = query.keyword || '';
    const categoryId = query.categoryId || '';
    let where = 'p.status = 1';
    const params = [];
    if (keyword) { where += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push('%' + keyword + '%', '%' + keyword + '%'); }
    if (categoryId) { where += ' AND p.category_id = ?'; params.push(categoryId); }
    const [products] = await this.pool.query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE ' + where + ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?',
      [...params, Number(pageSize), Number(offset)]
    );
    resolveProductAssets(products);
    const [[{ count }]] = await this.pool.query('SELECT COUNT(*) as count FROM products p WHERE ' + where, params);
    return this.formatList(products, page, pageSize, count);
  }

  async hot(query) {
    const limit = parseInt(query.limit) || 10;
    const [products] = await this.pool.query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 1 ORDER BY p.sales DESC LIMIT ?', [Number(limit)]
    );
    resolveProductAssets(products);
    return { list: products };
  }

  async recommend(query) {
    const userId = parseInt(query.userId) || 0;
    const limit = parseInt(query.limit) || 10;
    let recommendedProducts = [];

    if (userId > 0) {
      const [behaviors] = await this.pool.query(
        `SELECT p.category_id, COUNT(*) as cnt
         FROM user_behavior_logs ubl
         JOIN products p ON ubl.target_id = p.id
         WHERE ubl.user_id = ? AND ubl.target_type = 'product' AND p.status = 1
         GROUP BY p.category_id
         ORDER BY cnt DESC
         LIMIT 5`,
        [userId]
      );

      if (behaviors.length > 0) {
        const categoryIds = behaviors.map((b) => b.category_id);
        const placeholders = categoryIds.map(() => '?').join(',');
        const [products] = await this.pool.query(
          `SELECT p.*, c.name as category_name
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.id
           WHERE p.status = 1 AND p.category_id IN (${placeholders})
           AND p.id NOT IN (
             SELECT target_id FROM user_behavior_logs
             WHERE user_id = ? AND action = 'dislike'
           )
           ORDER BY p.sales DESC, p.created_at DESC
           LIMIT ?`,
          [...categoryIds, userId, Number(limit)]
        );
        recommendedProducts = products;
      }
    }

    if (recommendedProducts.length < limit) {
      const remain = limit - recommendedProducts.length;
      const excludeIds = recommendedProducts.map((p) => p.id).join(',');
      const [hotProducts] = await this.pool.query(
        `SELECT p.*, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.status = 1 ${recommendedProducts.length > 0 ? `AND p.id NOT IN (${excludeIds})` : ''}
         ORDER BY p.sales DESC, p.rating DESC
         LIMIT ?`,
        [Number(remain)]
      );
      recommendedProducts = [...recommendedProducts, ...hotProducts];
    }

    resolveProductAssets(recommendedProducts);

    return { list: recommendedProducts, type: userId > 0 ? 'personalized' : 'hot' };
  }

  async dashboardOverview() {
    const [[salesStats]] = await this.pool.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status >= 2 THEN total_amount ELSE 0 END) as total_sales,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_orders,
        SUM(CASE WHEN DATE(created_at) = CURDATE() AND status >= 2 THEN total_amount ELSE 0 END) as today_sales
      FROM orders
    `);

    const [[productStats]] = await this.pool.query(`
      SELECT
        COUNT(*) as total_products,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active_products,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock
      FROM products
    `);

    const [[userStats]] = await this.pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()) as new_users_today
    `);

    const [orderStatus] = await this.pool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status');

    return {
      sales: salesStats,
      products: productStats,
      users: userStats,
      orderStatus: orderStatus.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {}),
    };
  }

  async salesTrend(query) {
    const days = parseInt(query.days) || 7;
    const [trend] = await this.pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(CASE WHEN status >= 2 THEN total_amount ELSE 0 END) as sales
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [Number(days)]);
    return { list: trend };
  }

  async topProducts(query) {
    const limit = parseInt(query.limit) || 10;
    const [products] = await this.pool.query(`
      SELECT
        p.id, p.name, p.price, p.sales, p.rating,
        c.name as category_name,
        m.name as merchant_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN merchants m ON p.merchant_id = m.id
      WHERE p.status = 1
      ORDER BY p.sales DESC
      LIMIT ?
    `, [Number(limit)]);
    return { list: products };
  }

  async categories() {
    const [rows] = await this.pool.query('SELECT * FROM categories WHERE status = 1 ORDER BY sort_order, id');
    return rows;
  }

  async category(id) {
    const [rows] = await this.pool.query('SELECT * FROM categories WHERE id = ? AND status = 1', [id]);
    if (rows.length === 0) throw Object.assign(new Error('Not found'), { httpStatus: 404 });
    return rows[0];
  }

  async detail(id) {
    const [products] = await this.pool.query(
      'SELECT p.*, c.name as category_name, m.name as merchant_name FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN merchants m ON p.merchant_id = m.id WHERE p.id = ? AND p.status = 1',
      [id]
    );
    if (products.length === 0) throw Object.assign(new Error('Not found'), { httpStatus: 404 });
    const product = products[0];
    resolveProductAssets([product]);
    const [skus] = await this.pool.query('SELECT * FROM product_skus WHERE product_id = ? AND status = 1', [id]);
    product.skus = skus;
    const [images] = await this.pool.query('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order', [id]);
    product.images = resolveAssetList(images.map((i) => i.image_url));
    const [[avg]] = await this.pool.query('SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE product_id = ?', [id]);
    product.avg_rating = avg.avg_rating ? parseFloat(avg.avg_rating).toFixed(1) : 0;
    product.review_count = avg.total;
    return product;
  }

  async reviewsByProduct(id, query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const rating = query.rating || '';
    let where = 'r.product_id = ?';
    const params = [id];
    if (rating) { where += ' AND r.rating = ?'; params.push(rating); }
    const [reviews] = await this.pool.query(
      'SELECT r.*, u.nickname, u.avatar FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE ' + where + ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?',
      [...params, Number(pageSize), Number(offset)]
    );
    reviews.forEach((review) => {
      review.avatar = resolveAssetUrl(review.avatar);
    });
    const [[{ count }]] = await this.pool.query('SELECT COUNT(*) as count FROM reviews r WHERE ' + where, params);
    const [[avg]] = await this.pool.query('SELECT AVG(rating) as avg_rating FROM reviews WHERE product_id = ?', [id]);
    const [dist] = await this.pool.query('SELECT rating, COUNT(*) as cnt FROM reviews WHERE product_id = ? GROUP BY rating', [id]);
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    dist.forEach((d) => { ratingDist[d.rating] = d.cnt; });
    return { list: reviews, averageRating: avg.avg_rating ? parseFloat(avg.avg_rating).toFixed(1) : '0.0', totalReviews: count, ratingDistribution: ratingDist, pagination: { page, pageSize, total: count } };
  }

  async reviewsMine(userId, query) {
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const [reviews] = await this.pool.query(
      'SELECT r.*, p.name as product_name, p.image as product_image FROM reviews r LEFT JOIN products p ON r.product_id = p.id WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset]
    );
    reviews.forEach((review) => {
      review.product_image = resolveAssetUrl(review.product_image);
    });
    const [[{ count }]] = await this.pool.query('SELECT COUNT(*) as count FROM reviews WHERE user_id = ?', [userId]);
    return { list: reviews, pagination: { page, pageSize, total: count } };
  }

  async submitReview(userId, body) {
    const { product_id, order_id, rating, content, images } = body;
    if (!product_id || !rating) throw Object.assign(new Error('product_id and rating required'), { httpStatus: 400 });
    if (rating < 1 || rating > 5) throw Object.assign(new Error('rating 1-5'), { httpStatus: 400 });
    const [result] = await this.pool.query(
      'INSERT INTO reviews (user_id, product_id, order_id, rating, content, images) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, product_id, order_id || null, rating, content || '', JSON.stringify(images || [])]
    );
    return { id: result.insertId };
  }

  async skuOptions(productId) {
    const [options] = await this.pool.query('SELECT * FROM product_spec_options WHERE product_id = ? ORDER BY sort_order', [productId]);
    const specMap = {};
    options.forEach((opt) => { if (!specMap[opt.spec_name]) specMap[opt.spec_name] = []; specMap[opt.spec_name].push(opt.spec_value); });
    return specMap;
  }

  async skuList(productId) {
    const [skus] = await this.pool.query('SELECT * FROM product_skus WHERE product_id = ? AND status = 1 ORDER BY price', [productId]);
    return skus;
  }

  async skuFind(productId, body) {
    const { specs } = body;
    if (!specs || Object.keys(specs).length === 0) throw Object.assign(new Error('specs required'), { httpStatus: 400 });
    const conditions = [];
    const params = [productId];
    for (const [name, value] of Object.entries(specs)) {
      conditions.push('(product_id = ? AND spec_name = ? AND spec_value = ?)');
      params.push(productId, name, value);
    }
    const [options] = await this.pool.query('SELECT DISTINCT product_id FROM product_spec_options WHERE ' + conditions.join(' OR '), params);
    if (options.length === 0) throw Object.assign(new Error('Not found'), { httpStatus: 404 });
    const [skus] = await this.pool.query('SELECT * FROM product_skus WHERE product_id = ? AND status = 1', [productId]);
    return skus[0] || null;
  }

  formatList(products, page, pageSize, total) {
    resolveProductAssets(products);
    return { list: products, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }
}

const productService = new ProductService();

module.exports = { productService, formatProductList: ProductService.prototype.formatList, resolveProductAssets };
