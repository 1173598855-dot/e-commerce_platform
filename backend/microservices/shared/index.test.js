const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-64-characters-for-shared-tests';

const { generateToken, requirePermission, requireRole, sendRes, sendError } = require('./index');

test('module load fails when JWT_SECRET is missing', () => {
  const previousSecret = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  delete require.cache[require.resolve('./index')];

  assert.throws(() => require('./index'), /JWT_SECRET is required/);

  process.env.JWT_SECRET = previousSecret;
  delete require.cache[require.resolve('./index')];
  require('./index');
});

function createResponse(requestId) {
  return {
    statusCode: null,
    body: null,
    req: { headers: { 'x-request-id': requestId } },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    getHeader() {
      return undefined;
    }
  };
}

test('sendRes returns unified response contract with requestId', () => {
  const res = createResponse('req-123');

  sendRes(res, { ok: true }, 'ok');

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    code: 200,
    data: { ok: true },
    message: 'ok',
    requestId: 'req-123'
  });
});

test('sendError returns numeric code and requestId', () => {
  const res = createResponse('req-456');

  sendError(res, 'Token invalid', 401, 30002);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    code: 30002,
    data: null,
    message: 'Token invalid',
    requestId: 'req-456'
  });
});

test('requireRole rejects authenticated users without an allowed role', () => {
  const middleware = requireRole('admin', 'merchant');
  const req = { user: { userId: 7, role: 'customer' } };
  const res = createResponse('req-role-denied');
  let nextCalled = false;

  middleware(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 30003);
});

test('requireRole allows authenticated users with an allowed role', () => {
  const middleware = requireRole('admin', 'merchant');
  const req = { user: { userId: 8, role: 'admin' } };
  const res = createResponse('req-role-allowed');
  let nextCalled = false;

  middleware(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test('requirePermission allows admin role by default', () => {
  const middleware = requirePermission('refund:review');
  const req = { user: { userId: 8, role: 'admin' } };
  const res = createResponse('req-permission-admin');
  let nextCalled = false;

  middleware(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test('requirePermission allows merchant default refund and shipping permissions', () => {
  const middleware = requirePermission('refund:list', 'order:ship');
  const req = { user: { userId: 9, role: 'merchant' } };
  const res = createResponse('req-permission-merchant');
  let nextCalled = false;

  middleware(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test('requirePermission rejects role without required permission', () => {
  const middleware = requirePermission('refund:review');
  const req = { user: { userId: 10, role: 'customer' } };
  const res = createResponse('req-permission-denied');
  let nextCalled = false;

  middleware(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 30004);
});

test('requirePermission honors explicit token permissions', () => {
  const middleware = requirePermission('finance:reconcile');
  const req = { user: { userId: 11, role: 'merchant', permissions: ['finance:reconcile'] } };
  const res = createResponse('req-permission-explicit');
  let nextCalled = false;

  middleware(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test('generateToken defaults missing role to customer', () => {
  const token = generateToken({ userId: 9, phone: '13800138009' });
  const decoded = require('jsonwebtoken').decode(token);

  assert.equal(decoded.role, 'customer');
});
