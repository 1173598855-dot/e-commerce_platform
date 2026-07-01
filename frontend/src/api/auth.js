import api from './client';

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  smsLogin: (data) => api.post('/auth/sms-login', data),
  passwordLogin: (data) => api.post('/auth/password-login', data),
  sendCode: (phone) => api.post('/auth/send-code', { phone }),
  wxLogin: (data) => api.post('/auth/wx-login', data),
  qqLogin: (data) => api.post('/auth/qq-login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  refresh: (data) => api.post('/auth/refresh', data),
  verify: (data) => api.post('/auth/verify', data),
  logout: () => api.post('/auth/logout'),
  listRolePermissions: (role) => api.get('/auth/permissions/roles', { params: { role } }),
  updateRolePermissions: (role, permissions) => api.put(`/auth/permissions/roles/${role}`, { permissions }),
  listPermissionAuditLogs: (params) => api.get('/auth/permissions/audits', { params }),
};
