const express = require('express');
const {
  authMiddleware,
  requirePermission,
  requireRole,
} = require('../../shared');
const {
  health,
  register,
  passwordLogin,
  sendCode,
  smsLogin,
  wxLogin,
  qqLogin,
  profile,
  refresh,
  verify,
  logout,
  updateProfile,
  listRolePermissions,
  updateRolePermissions,
  listPermissionAuditLogs,
} = require('../controllers/auth.controller');

const router = express.Router();
const permissionAdmin = [authMiddleware, requireRole('admin'), requirePermission('permission:manage')];

router.get('/health', health);
router.post('/register', register);
router.post('/password-login', passwordLogin);
router.post('/send-code', sendCode);
router.post('/sms-login', smsLogin);
router.post('/wx-login', wxLogin);
router.post('/qq-login', qqLogin);
router.get('/profile', profile);
router.post('/refresh', refresh);
router.post('/verify', verify);
router.post('/logout', logout);
router.put('/profile', updateProfile);
router.get('/permissions/roles', ...permissionAdmin, listRolePermissions);
router.get('/permissions/audits', ...permissionAdmin, listPermissionAuditLogs);
router.put('/permissions/roles/:role', ...permissionAdmin, updateRolePermissions);

module.exports = router;
