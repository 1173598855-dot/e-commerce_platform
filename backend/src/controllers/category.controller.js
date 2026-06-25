const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

async function getCategoryList(req, res) {
  try {
    const [categories] = await mysqlPool.execute(
      'SELECT * FROM categories WHERE status = 1 ORDER BY sort_order'
    );
    sendRes(res, categories);
  } catch (err) {
    sendError(res, '获取分类失败', 500);
  }
}

async function getCategoryDetail(req, res) {
  try {
    const { id } = req.params;
    const [categories] = await mysqlPool.execute('SELECT * FROM categories WHERE id = ?', [id]);
    
    if (categories.length === 0) {
      return sendError(res, '分类不存在', 404);
    }
    sendRes(res, categories[0]);
  } catch (err) {
    sendError(res, '获取分类详情失败', 500);
  }
}

async function createCategory(req, res) {
  try {
    const { name, parent_id, icon, sort_order } = req.body;
    const result = await mysqlPool.execute(
      'INSERT INTO categories (name, parent_id, icon, sort_order) VALUES (?, ?, ?, ?)',
      [name, parent_id || null, icon || '', sort_order || 0]
    );
    sendRes(res, { id: result.insertId }, '分类创建成功');
  } catch (err) {
    sendError(res, '创建分类失败', 500);
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, parent_id, icon, sort_order, status } = req.body;
    const fields = [];
    const params = [];

    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (parent_id !== undefined) { fields.push('parent_id = ?'); params.push(parent_id); }
    if (icon !== undefined) { fields.push('icon = ?'); params.push(icon); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }

    params.push(id);
    await mysqlPool.execute(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, params);
    sendRes(res, null, '分类更新成功');
  } catch (err) {
    sendError(res, '更新分类失败', 500);
  }
}

module.exports = { getCategoryList, getCategoryDetail, createCategory, updateCategory };
