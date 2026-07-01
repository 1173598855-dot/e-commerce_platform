const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const redis = require('redis');
const mysql = require('mysql2/promise');
const { JWT_SECRET } = require('../../shared');
const { buildRedisClientOptions } = require('../../shared/redis-config');
const { createAuthPayload } = require('../auth-utils');
const { sendSmsCode } = require('../sms-provider');

function toPublicUser(user) {
  const { password, ...publicUser } = user;
  return publicUser;
}

function buildUserSelectQuery(whereClause, includePassword = false) {
  const passwordColumn = includePassword ? 'u.password, ' : '';
  return `SELECT u.id, u.phone, ${passwordColumn}u.nickname, u.avatar, u.role, mu.merchant_id AS merchant_id,
                 COALESCE(pv.version, 1) AS permission_version,
                 GROUP_CONCAT(DISTINCT CASE WHEN rp.status = 1 THEN rp.permission END) AS role_permissions,
                 GROUP_CONCAT(DISTINCT CASE WHEN up.status = 1 AND up.effect = 'allow' THEN up.permission END) AS user_allow_permissions,
                 GROUP_CONCAT(DISTINCT CASE WHEN up.status = 1 AND up.effect = 'deny' THEN up.permission END) AS user_deny_permissions,
                 TRIM(BOTH ',' FROM CONCAT_WS(',',
                   GROUP_CONCAT(DISTINCT CASE WHEN rp.status = 1 THEN rp.permission END),
                   GROUP_CONCAT(DISTINCT CASE WHEN up.status = 1 AND up.effect = 'allow' THEN up.permission END)
                 )) AS permissions,
                 u.points, u.status, u.created_at
          FROM users u
          LEFT JOIN merchant_users mu ON mu.user_id = u.id AND mu.status = 1
          LEFT JOIN role_permissions rp ON rp.role = u.role AND rp.status = 1
          LEFT JOIN user_permissions up ON up.user_id = u.id AND up.status = 1
          LEFT JOIN permission_versions pv ON pv.scope_type = 'role' AND pv.scope_key = u.role
          ${whereClause}
          GROUP BY u.id, u.phone, ${includePassword ? 'u.password, ' : ''}u.nickname, u.avatar, u.role, mu.merchant_id, pv.version, u.points, u.status, u.created_at`;
}

const SUPPORTED_ROLES = new Set(['admin', 'merchant', 'customer']);
const PERMISSION_PATTERN = /^[a-z][a-z0-9:*_-]*(?::[a-z0-9*_-]+)*$/;

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function normalizePermissions(permissions) {
  if (!Array.isArray(permissions)) {
    throw Object.assign(new Error('Permissions must be an array'), { httpStatus: 400 });
  }
  const normalized = [...new Set(permissions.map((permission) => String(permission || '').trim().toLowerCase()).filter(Boolean))];
  const invalid = normalized.find((permission) => !PERMISSION_PATTERN.test(permission));
  if (invalid) throw Object.assign(new Error('Invalid permission: ' + invalid), { httpStatus: 400 });
  return normalized;
}

function groupPermissionsByRole(rows) {
  return rows.reduce((result, row) => {
    const role = normalizeRole(row.role);
    if (!result[role]) result[role] = [];
    if (row.permission) result[role].push(row.permission);
    return result;
  }, {});
}

function isPermissionTokenVersionEnforced() {
  return process.env.PERMISSION_TOKEN_VERSION_ENFORCEMENT === '1';
}

class AuthService {
  constructor(pool) {
    this.pool = pool || mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'ecommerce',
      connectionLimit: 10,
    });
    this.redisClient = null;
  }

  async initRedis() {
    try {
      this.redisClient = redis.createClient(buildRedisClientOptions());
      this.redisClient.on('error', (err) => console.warn('Redis Error:', err.message));
      await this.redisClient.connect();
      console.log('Redis connected');
    } catch (err) {
      console.warn('Redis unavailable:', err.message);
      this.redisClient = null;
    }
  }

  async register(body) {
    const { phone, password, nickname } = body;
    if (!phone || !password) throw Object.assign(new Error('手机号和密码不能为空'), { httpStatus: 400 });
    const [existing] = await this.pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0) throw Object.assign(new Error('该手机号已注册'), { httpStatus: 400 });
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await this.pool.query('INSERT INTO users (phone, password, nickname) VALUES (?, ?, ?)', [phone, hashed, nickname || phone]);
    const user = { id: result.insertId, phone, nickname: nickname || phone, role: 'customer' };
    return createAuthPayload(user);
  }

  async passwordLogin(body) {
    const { phone, password } = body;
    if (!phone || !password) throw Object.assign(new Error('手机号和密码不能为空'), { httpStatus: 400 });
    const [users] = await this.pool.query(buildUserSelectQuery('WHERE u.phone = ?', true), [phone]);
    if (users.length === 0) throw Object.assign(new Error('手机号或密码错误'), { httpStatus: 400 });
    if (users[0].status === 0) throw Object.assign(new Error('账号已被禁用'), { httpStatus: 403 });
    const valid = await bcrypt.compare(password, users[0].password);
    if (!valid) throw Object.assign(new Error('手机号或密码错误'), { httpStatus: 400 });
    const user = toPublicUser(users[0]);
    await this.pool.query('UPDATE users SET last_login_time = NOW() WHERE id = ?', [user.id]);
    return createAuthPayload(user);
  }

  async sendCode(body) {
    const { phone } = body;
    if (!phone) throw Object.assign(new Error('手机号不能为空'), { httpStatus: 400 });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    if (!this.redisClient) {
      throw Object.assign(new Error('短信服务暂时不可用，请稍后再试'), { httpStatus: 500 });
    }
    await this.redisClient.set(`sms:${phone}`, code, { EX: parseInt(process.env.SMS_CODE_EXPIRE) || 300 });
    try {
      await sendSmsCode({ phone, code });
    } catch (err) {
      await this.redisClient.del(`sms:${phone}`).catch(() => null);
      throw Object.assign(new Error('短信发送失败: ' + err.message), { httpStatus: err.httpStatus || 502 });
    }
  }

  async smsLogin(body) {
    const { phone, code } = body;
    if (!phone || !code) throw Object.assign(new Error('手机号和验证码不能为空'), { httpStatus: 400 });
    if (!this.redisClient) {
      throw Object.assign(new Error('验证码服务暂时不可用，请稍后再试'), { httpStatus: 503 });
    }
    const storedCode = await this.redisClient.get(`sms:${phone}`);
    if (storedCode !== code) throw Object.assign(new Error('验证码错误或已过期'), { httpStatus: 400 });
    await this.redisClient.del(`sms:${phone}`);

    const [users] = await this.pool.query(buildUserSelectQuery('WHERE u.phone = ?'), [phone]);
    let user;
    if (users.length === 0) {
      const [result] = await this.pool.query("INSERT INTO users (phone, nickname, login_type) VALUES (?, ?, 'sms')", [phone, '用户' + phone.slice(-4)]);
      user = { id: result.insertId, phone, nickname: '用户' + phone.slice(-4), avatar: null, role: 'customer', points: 0 };
    } else {
      user = users[0];
      if (user.status === 0) throw Object.assign(new Error('账号已被禁用'), { httpStatus: 403 });
      await this.pool.query('UPDATE users SET last_login_time = NOW() WHERE id = ?', [user.id]);
    }
    return createAuthPayload(user);
  }

  async wxLogin(body) {
    const { code } = body;
    if (!code) throw Object.assign(new Error('微信授权码不能为空'), { httpStatus: 400 });
    const openid = 'wx_demo_' + code;
    const [users] = await this.pool.query(buildUserSelectQuery('WHERE u.wechat_openid = ?'), [openid]);
    let user;
    if (users.length === 0) {
      const [result] = await this.pool.query("INSERT INTO users (phone, nickname, wechat_openid, login_type) VALUES (?, ?, ?, 'wechat')", ['', '微信用户', openid]);
      user = { id: result.insertId, nickname: '微信用户', role: 'customer' };
    } else {
      user = users[0];
      if (user.status === 0) throw Object.assign(new Error('账号已被禁用'), { httpStatus: 403 });
      await this.pool.query('UPDATE users SET last_login_time = NOW() WHERE id = ?', [user.id]);
    }
    return createAuthPayload(user);
  }

  async qqLogin(body) {
    const { code } = body;
    if (!code) throw Object.assign(new Error('QQ授权码不能为空'), { httpStatus: 400 });
    const openid = 'qq_demo_' + code;
    const [users] = await this.pool.query(buildUserSelectQuery('WHERE u.qq_openid = ?'), [openid]);
    let user;
    if (users.length === 0) {
      const [result] = await this.pool.query("INSERT INTO users (phone, nickname, qq_openid, login_type) VALUES (?, ?, ?, 'qq')", ['', 'QQ用户', openid]);
      user = { id: result.insertId, nickname: 'QQ用户', role: 'customer' };
    } else {
      user = users[0];
      if (user.status === 0) throw Object.assign(new Error('账号已被禁用'), { httpStatus: 403 });
      await this.pool.query('UPDATE users SET last_login_time = NOW() WHERE id = ?', [user.id]);
    }
    return createAuthPayload(user);
  }

  async profile(userId) {
    const [users] = await this.pool.query(buildUserSelectQuery('WHERE u.id = ?'), [userId]);
    if (users.length === 0) throw Object.assign(new Error('用户不存在'), { httpStatus: 404 });
    return users[0];
  }

  async refresh(refreshToken) {
    if (!refreshToken) throw Object.assign(new Error('refreshToken 不能为空'), { httpStatus: 400 });
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err) {
      throw Object.assign(new Error('refreshToken 无效或已过期'), { httpStatus: 401 });
    }
    const [users] = await this.pool.query(buildUserSelectQuery('WHERE u.id = ?'), [decoded.userId]);
    if (isPermissionTokenVersionEnforced()) {
      const permissionVersion = await this.verifyPermissionVersion(decoded);
      if (!permissionVersion.valid) {
        throw Object.assign(new Error('permission version is stale'), { httpStatus: 401, reason: permissionVersion.reason });
      }
    }
    if (users.length === 0) throw Object.assign(new Error('用户不存在'), { httpStatus: 404 });
    if (users[0].status === 0) throw Object.assign(new Error('账号已被禁用'), { httpStatus: 403 });
    const user = users[0];
    const authPayload = createAuthPayload(user);
    const accessToken = authPayload.accessToken;
    const newRefreshToken = authPayload.refreshToken;
    return { accessToken, refreshToken: newRefreshToken, user };
  }

  async verify(token) {
    if (!token) throw Object.assign(new Error('token 不能为空'), { httpStatus: 400 });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (isPermissionTokenVersionEnforced()) {
        const permissionVersion = await this.verifyPermissionVersion(decoded);
        if (!permissionVersion.valid) return { valid: false, reason: permissionVersion.reason };
      }
      return { valid: true, user: decoded };
    } catch (err) {
      return { valid: false };
    }
  }

  async logout() {
    return null;
  }

  async updateProfile(userId, body) {
    const { nickname, avatar } = body;
    const fields = [];
    const params = [];
    if (nickname) { fields.push('nickname = ?'); params.push(nickname); }
    if (avatar) { fields.push('avatar = ?'); params.push(avatar); }
    if (fields.length === 0) throw Object.assign(new Error('没有需要更新的字段'), { httpStatus: 400 });
    params.push(userId);
    await this.pool.query('UPDATE users SET ' + fields.join(', ') + ' WHERE id = ?', params);
    return null;
  }

  async listRolePermissions(role) {
    const targetRole = normalizeRole(role);
    const params = [];
    let whereClause = 'WHERE status = 1';
    if (targetRole) {
      if (!SUPPORTED_ROLES.has(targetRole)) throw Object.assign(new Error('Unsupported role: ' + targetRole), { httpStatus: 400 });
      whereClause += ' AND role = ?';
      params.push(targetRole);
    }
    const [rows] = await this.pool.query(
      `SELECT role, permission FROM role_permissions ${whereClause} ORDER BY role ASC, permission ASC`,
      params
    );
    return groupPermissionsByRole(rows);
  }

  async updateRolePermissions(operator, role, permissions) {
    const targetRole = normalizeRole(role);
    if (!SUPPORTED_ROLES.has(targetRole)) throw Object.assign(new Error('Unsupported role: ' + targetRole), { httpStatus: 400 });
    const nextPermissions = normalizePermissions(permissions);
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      const [beforeRows] = await connection.execute(
        'SELECT permission FROM role_permissions WHERE role = ? AND status = 1 ORDER BY permission ASC',
        [targetRole]
      );
      const beforePermissions = beforeRows.map((row) => row.permission);

      await connection.execute('UPDATE role_permissions SET status = 0 WHERE role = ?', [targetRole]);
      for (const permission of nextPermissions) {
        await connection.execute(
          `INSERT INTO role_permissions (role, permission, status) VALUES (?, ?, 1)
           ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP`,
          [targetRole, permission]
        );
      }
      await connection.execute(
        `INSERT INTO permission_audit_logs
         (operator_id, target_type, target_key, action, before_permissions, after_permissions, note)
         VALUES (?, 'role', ?, 'update_role_permissions', CAST(? AS JSON), CAST(? AS JSON), ?)`,
        [
          operator && operator.userId,
          targetRole,
          JSON.stringify(beforePermissions),
          JSON.stringify(nextPermissions),
          'replace role permissions',
        ]
      );
      await connection.execute(
        `INSERT INTO permission_versions (scope_type, scope_key, version, invalidated_at)
         VALUES ('role', ?, 2, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE version = version + 1, invalidated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`,
        [targetRole]
      );
      await connection.commit();
      return { role: targetRole, permissions: nextPermissions };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async verifyPermissionVersion(decodedToken = {}) {
    const role = normalizeRole(decodedToken.role);
    const tokenVersion = Number(decodedToken.permissionVersion || decodedToken.permission_version || 1);
    const [rows] = await this.pool.query(
      'SELECT version FROM permission_versions WHERE scope_type = ? AND scope_key = ? LIMIT 1',
      ['role', role]
    );
    const currentVersion = Number((rows[0] && rows[0].version) || 1);
    const normalizedTokenVersion = Number.isInteger(tokenVersion) && tokenVersion > 0 ? tokenVersion : 1;
    if (normalizedTokenVersion < currentVersion) {
      return { valid: false, reason: 'permission_version_stale', currentVersion, tokenVersion: normalizedTokenVersion };
    }
    return { valid: true, currentVersion, tokenVersion: normalizedTokenVersion };
  }

  async listPermissionAuditLogs(query = {}) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(query.pageSize, 10) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    const where = [];
    const params = [];
    const targetRole = normalizeRole(query.role);
    if (targetRole) {
      if (!SUPPORTED_ROLES.has(targetRole)) throw Object.assign(new Error('Unsupported role: ' + targetRole), { httpStatus: 400 });
      where.push('target_key = ?');
      params.push(targetRole);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await this.pool.query(
      `SELECT id, operator_id, target_type, target_key, action, before_permissions, after_permissions, note, created_at
       FROM permission_audit_logs ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[{ count }]] = await this.pool.query(`SELECT COUNT(*) AS count FROM permission_audit_logs ${whereSql}`, params);
    return { list: rows, pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) } };
  }
}

const authService = new AuthService();

module.exports = { AuthService, authService, toPublicUser, buildUserSelectQuery, isPermissionTokenVersionEnforced };
