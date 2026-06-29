/**
 * 管理员权限验证中间件
 */

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  // 检查用户角色是否为管理员
  // 假设用户信息中有 role 字段，或者从数据库查询
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '需要管理员权限' });
  }

  next();
}

/**
 * 简化版：检查用户ID是否在管理员列表中
 * 在生产环境中，应该从数据库或配置中读取管理员列表
 */
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS
  ? process.env.ADMIN_USER_IDS.split(',').map(id => parseInt(id))
  : [];

function requireAdminSimple(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  if (!ADMIN_USER_IDS.includes(req.user.userId)) {
    return res.status(403).json({ success: false, message: '需要管理员权限' });
  }

  next();
}

module.exports = { requireAdmin, requireAdminSimple };
