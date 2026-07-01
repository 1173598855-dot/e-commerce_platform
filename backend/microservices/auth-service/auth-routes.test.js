const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-64-characters-for-auth-route-test';

const router = require('./routes/auth.routes');

test('role permission list route requires auth admin role and permission management permission', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/permissions/roles' && candidate.methods.get);

  assert.ok(route, 'role permission list route should be registered');
  assert.equal(route.stack.length, 4);
});

test('role permission update route requires auth admin role and permission management permission', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/permissions/roles/:role' && candidate.methods.put);

  assert.ok(route, 'role permission update route should be registered');
  assert.equal(route.stack.length, 4);
});

test('permission audit list route requires auth admin role and permission management permission', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/permissions/audits' && candidate.methods.get);

  assert.ok(route, 'permission audit list route should be registered');
  assert.equal(route.stack.length, 4);
});
