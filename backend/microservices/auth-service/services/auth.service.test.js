const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-64-characters-for-auth-service-test';

const { AuthService, toPublicUser } = require('../services/auth.service');

test('toPublicUser strips password field from auth responses', () => {
  const user = {
    id: 7,
    phone: '13800138000',
    nickname: 'Neo',
    password: 'hashed-secret',
    avatar: 'avatar.png'
  };

  assert.deepEqual(toPublicUser(user), {
    id: 7,
    phone: '13800138000',
    nickname: 'Neo',
    avatar: 'avatar.png'
  });
});

test('listRolePermissions returns permissions grouped by role', async () => {
  const calls = [];
  const service = new AuthService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      return [[{ role: 'merchant', permission: 'refund:list' }, { role: 'merchant', permission: 'order:ship' }]];
    },
  });

  const result = await service.listRolePermissions('merchant');

  assert.deepEqual(result, { merchant: ['refund:list', 'order:ship'] });
  assert.equal(calls[0][1].includes('FROM role_permissions'), true);
  assert.deepEqual(calls[0][2], ['merchant']);
});

test('updateRolePermissions replaces role permissions and writes audit log in one transaction', async () => {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push(['beginTransaction']); },
    async commit() { calls.push(['commit']); },
    async rollback() { calls.push(['rollback']); },
    async execute(sql, params) {
      calls.push(['execute', sql, params]);
      if (sql.includes('FROM role_permissions')) return [[{ permission: 'refund:list' }]];
      return [{ affectedRows: 1 }];
    },
    release() { calls.push(['release']); },
  };
  const service = new AuthService({ getConnection: async () => connection });

  const result = await service.updateRolePermissions(
    { userId: 9001, role: 'admin' },
    'merchant',
    ['refund:list', 'order:ship', 'refund:list']
  );

  assert.deepEqual(result, { role: 'merchant', permissions: ['refund:list', 'order:ship'] });
  assert.equal(calls.some((call) => call[1]?.includes('UPDATE role_permissions SET status = 0')), true);
  assert.equal(calls.some((call) => call[1]?.includes('INSERT INTO role_permissions')), true);
  assert.equal(calls.some((call) => call[1]?.includes('INSERT INTO permission_audit_logs')), true);
  assert.equal(calls.some((call) => call[1]?.includes('INSERT INTO permission_versions')), true);
  assert.equal(calls.at(-2)[0], 'commit');
  assert.equal(calls.at(-1)[0], 'release');
});

test('verifyPermissionVersion reports stale role permission tokens', async () => {
  const calls = [];
  const service = new AuthService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      return [[{ version: 4 }]];
    },
  });

  const result = await service.verifyPermissionVersion({ role: 'merchant', permissionVersion: 3 });

  assert.deepEqual(result, { valid: false, reason: 'permission_version_stale', currentVersion: 4, tokenVersion: 3 });
  assert.equal(calls[0][1].includes('FROM permission_versions'), true);
  assert.deepEqual(calls[0][2], ['role', 'merchant']);
});

test('verifyPermissionVersion accepts current or missing permission version rows', async () => {
  const service = new AuthService({
    async query() {
      return [[]];
    },
  });

  assert.deepEqual(await service.verifyPermissionVersion({ role: 'merchant', permissionVersion: 1 }), {
    valid: true,
    currentVersion: 1,
    tokenVersion: 1,
  });
});

test('verify rejects stale permission tokens when enforcement is enabled', async () => {
  const previous = process.env.PERMISSION_TOKEN_VERSION_ENFORCEMENT;
  process.env.PERMISSION_TOKEN_VERSION_ENFORCEMENT = '1';
  const token = jwt.sign({ userId: 4, role: 'merchant', permissionVersion: 2 }, process.env.JWT_SECRET);
  const service = new AuthService({
    async query() {
      return [[{ version: 3 }]];
    },
  });

  try {
    const result = await service.verify(token);
    assert.deepEqual(result, { valid: false, reason: 'permission_version_stale' });
  } finally {
    if (previous === undefined) delete process.env.PERMISSION_TOKEN_VERSION_ENFORCEMENT;
    else process.env.PERMISSION_TOKEN_VERSION_ENFORCEMENT = previous;
  }
});

test('refresh rejects stale refresh tokens when permission version enforcement is enabled', async () => {
  const previous = process.env.PERMISSION_TOKEN_VERSION_ENFORCEMENT;
  process.env.PERMISSION_TOKEN_VERSION_ENFORCEMENT = '1';
  const token = jwt.sign({ userId: 4, role: 'merchant', permissionVersion: 2, type: 'refresh' }, process.env.JWT_SECRET);
  const service = new AuthService({
    async query() {
      return [[{ version: 3 }]];
    },
  });

  try {
    await assert.rejects(() => service.refresh(token), /permission version is stale/);
  } finally {
    if (previous === undefined) delete process.env.PERMISSION_TOKEN_VERSION_ENFORCEMENT;
    else process.env.PERMISSION_TOKEN_VERSION_ENFORCEMENT = previous;
  }
});

test('updateRolePermissions rejects invalid role and permission values', async () => {
  const service = new AuthService({ getConnection: async () => { throw new Error('should not connect'); } });

  await assert.rejects(
    () => service.updateRolePermissions({ userId: 9001 }, 'unknown', ['refund:list']),
    /Unsupported role/
  );
  await assert.rejects(
    () => service.updateRolePermissions({ userId: 9001 }, 'merchant', ['bad permission']),
    /Invalid permission/
  );
});

test('listPermissionAuditLogs returns paged audit records filtered by role target', async () => {
  const calls = [];
  const service = new AuthService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('COUNT(*) AS count')) return [[{ count: 1 }]];
      return [[{
        id: 88,
        operator_id: 9001,
        target_type: 'role',
        target_key: 'merchant',
        action: 'update_role_permissions',
        before_permissions: '["refund:list"]',
        after_permissions: '["refund:list","order:ship"]',
        note: 'replace role permissions',
        created_at: '2026-07-01 10:00:00',
      }]];
    },
  });

  const result = await service.listPermissionAuditLogs({ role: 'merchant', page: '1', pageSize: '20' });

  assert.equal(result.list.length, 1);
  assert.deepEqual(result.pagination, { page: 1, pageSize: 20, total: 1, totalPages: 1 });
  assert.equal(calls.some((call) => call[1].includes('FROM permission_audit_logs')), true);
  assert.equal(calls.some((call) => call[1].includes('target_key = ?')), true);
  assert.equal(calls.every((call) => call[2].includes('merchant')), true);
});
