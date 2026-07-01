const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-64-characters-for-auth-controller-test';

const servicePath = require.resolve('../services/auth.service');
const controllerPath = require.resolve('./auth.controller');

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    getHeader() {
      return 'req-controller-test';
    },
  };
}

function loadControllerWithService(authService) {
  delete require.cache[controllerPath];
  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: { authService },
  };
  return require('./auth.controller');
}

test('listRolePermissions delegates optional role filter to auth service', async () => {
  const calls = [];
  const controller = loadControllerWithService({
    async listRolePermissions(role) {
      calls.push(role);
      return { merchant: ['refund:list'] };
    },
  });
  const res = createResponse();

  await controller.listRolePermissions({ query: { role: 'merchant' } }, res);

  assert.deepEqual(calls, ['merchant']);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, { merchant: ['refund:list'] });
});

test('updateRolePermissions delegates operator role and permissions to auth service', async () => {
  const calls = [];
  const controller = loadControllerWithService({
    async updateRolePermissions(operator, role, permissions) {
      calls.push({ operator, role, permissions });
      return { role, permissions };
    },
  });
  const res = createResponse();
  const req = {
    user: { userId: 1, role: 'admin' },
    params: { role: 'merchant' },
    body: { permissions: ['refund:list', 'order:ship'] },
  };

  await controller.updateRolePermissions(req, res);

  assert.deepEqual(calls, [{ operator: req.user, role: 'merchant', permissions: ['refund:list', 'order:ship'] }]);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, { role: 'merchant', permissions: ['refund:list', 'order:ship'] });
});
