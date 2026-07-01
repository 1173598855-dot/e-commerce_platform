const jwt = require('jsonwebtoken');
const { JWT_SECRET, generateToken } = require('../shared');

function normalizePermissions(permissions) {
  const values = Array.isArray(permissions)
    ? permissions
    : String(permissions || '').split(',');
  return [...new Set(values.map((permission) => String(permission || '').trim().toLowerCase()).filter(Boolean))];
}

function normalizePermissionVersion(user) {
  const version = Number(user.permissionVersion || user.permission_version || 1);
  return Number.isInteger(version) && version > 0 ? version : 1;
}

function createRefreshToken(user) {
  const merchantId = user.merchantId || user.merchant_id || null;
  const permissions = normalizePermissions(user.permissions);
  const permissionVersion = normalizePermissionVersion(user);
  return jwt.sign(
    { userId: user.id, phone: user.phone || '', role: user.role || 'customer', merchantId, permissions, permissionVersion, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function buildAuthPayload(user, tokens) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user,
  };
}

function createAuthPayload(user) {
  const merchantId = user.merchantId || user.merchant_id || null;
  const permissions = normalizePermissions(user.permissions);
  const permissionVersion = normalizePermissionVersion(user);
  const accessToken = generateToken({ userId: user.id, phone: user.phone || '', role: user.role || 'customer', merchantId, permissions, permissionVersion });
  const refreshToken = createRefreshToken(user);
  return buildAuthPayload(user, { accessToken, refreshToken });
}

module.exports = { buildAuthPayload, createAuthPayload, createRefreshToken, normalizePermissions, normalizePermissionVersion };
