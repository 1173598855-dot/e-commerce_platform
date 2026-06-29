const mysql = require('mysql2/promise');

class SearchService {
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
    return { service: 'search-service', status: 'running' };
  }

  async search(query) {
    const keyword = query.keyword || '';
    const categoryId = query.categoryId || '';
    const page = parseInt(query.page) || 1;
    const pageSize = parseInt(query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    if (!keyword.trim()) throw Object.assign(new Error('Keyword required'), { httpStatus: 400 });
    let whereClause = 'status = 1 AND (name LIKE ? OR description LIKE ?)';
    const params = ['%' + keyword + '%', '%' + keyword + '%'];
    if (categoryId) { whereClause += ' AND category_id = ?'; params.push(categoryId); }
    const [rows] = await this.pool.query(
      'SELECT * FROM products WHERE ' + whereClause + ' ORDER BY sales DESC LIMIT ? OFFSET ?',
      [...params, pageSize, offset]
    );
    const [[{ count }]] = await this.pool.query('SELECT COUNT(*) as count FROM products WHERE ' + whereClause, params);
    return { list: rows, pagination: { page, pageSize, total: count }, keyword };
  }

  async suggestions(keyword) {
    if (!keyword.trim()) throw Object.assign(new Error('Keyword required'), { httpStatus: 400 });
    const [rows] = await this.pool.query('SELECT DISTINCT name FROM products WHERE status=1 AND (name LIKE ? OR description LIKE ?) LIMIT 10', ['%' + keyword + '%', '%' + keyword + '%']);
    return rows.map((row) => row.name);
  }

  async hot() {
    const [rows] = await this.pool.query('SELECT keyword, search_count FROM hot_searches ORDER BY search_count DESC LIMIT 10');
    return rows;
  }

  async saveHistory(userId, body) {
    const { keyword } = body;
    if (!keyword) throw Object.assign(new Error('Keyword required'), { httpStatus: 400 });
    await this.pool.query("INSERT INTO search_histories (user_id, keyword, source, created_at) VALUES (?, ?, 'app', NOW())", [userId, keyword]);
    await this.pool.query("INSERT INTO hot_searches (keyword, search_count, is_hot, created_at) VALUES (?, 1, 0, NOW()) ON DUPLICATE KEY UPDATE search_count = search_count + 1", [keyword]);
    return null;
  }

  async history(userId, query) {
    const limit = parseInt(query.limit) || 20;
    const [rows] = await this.pool.query('SELECT keyword, created_at FROM search_histories WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
    return rows;
  }

  async clearHistory(userId) {
    await this.pool.query('DELETE FROM search_histories WHERE user_id = ?', [userId]);
    return null;
  }
}

const searchService = new SearchService();

module.exports = { searchService };
