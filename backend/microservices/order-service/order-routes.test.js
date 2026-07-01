const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-64-characters-for-order-route-test';

const router = require('./routes/order.routes');

test('payment callback route is a public POST endpoint for provider callbacks', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/payment/callback/:provider');

  assert.ok(route, 'payment callback route should be registered');
  assert.equal(Boolean(route.methods.post), true);
  assert.equal(route.stack.length, 1, 'payment callback should not require user auth middleware');
});

test('refund callback route is a public POST endpoint for provider callbacks', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/refund/callback/:provider');

  assert.ok(route, 'refund callback route should be registered');
  assert.equal(Boolean(route.methods.post), true);
  assert.equal(route.stack.length, 1, 'refund callback should not require user auth middleware');
});

test('refund evidence scanner callback route is public but signature-verified by controller', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/refunds/evidence/scan/callback');

  assert.ok(route, 'refund evidence scanner callback route should be registered');
  assert.equal(Boolean(route.methods.post), true);
  assert.equal(route.stack.length, 1, 'scanner callback should not require user auth middleware');
});

test('static payment, refund and shipping routes are registered before generic order detail route', () => {
  const paths = router.stack.map((layer) => layer.route?.path).filter(Boolean);
  const detailIndex = paths.indexOf('/:id');

  assert.ok(paths.indexOf('/payment/history') < detailIndex, 'payment history route must not be shadowed by /:id');
  assert.ok(paths.indexOf('/payment/:orderId/status') < detailIndex, 'payment status route must not be shadowed by /:id');
  assert.ok(paths.indexOf('/refunds') < detailIndex, 'refund request route must not be shadowed by /:id');
  assert.ok(paths.indexOf('/:id/ship') < detailIndex, 'shipping route must not be shadowed by /:id');
});

test('refund request route requires user auth middleware', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/refunds');

  assert.ok(route, 'refund request route should be registered');
  assert.equal(Boolean(route.methods.post), true);
  assert.equal(route.stack.length, 2, 'refund requests should require user auth middleware');
});

test('refund evidence route requires user auth middleware', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/refunds/:id/evidence');

  assert.ok(route, 'refund evidence route should be registered');
  assert.equal(Boolean(route.methods.post), true);
  assert.equal(route.stack.length, 2, 'refund evidence should require user auth middleware');
});

test('refund evidence upload intent route requires user auth middleware', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/refunds/:id/evidence/upload-intent');

  assert.ok(route, 'refund evidence upload intent route should be registered');
  assert.equal(Boolean(route.methods.post), true);
  assert.equal(route.stack.length, 2, 'refund evidence upload intent should require user auth middleware');
});

test('refund evidence scan route requires admin role and refund review permission', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/refunds/evidence/:evidenceId/scan');

  assert.ok(route, 'refund evidence scan route should be registered');
  assert.equal(Boolean(route.methods.put), true);
  assert.equal(route.stack.length, 4, 'refund evidence scan should require auth, admin role and permission middleware');
});

test('refund evidence retention cleanup dry-run route requires admin role and refund review permission', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/refunds/evidence/retention/cleanup-dry-run');

  assert.ok(route, 'refund evidence retention cleanup dry-run route should be registered');
  assert.equal(Boolean(route.methods.get), true);
  assert.equal(route.stack.length, 4, 'retention cleanup dry-run should require auth, admin role and permission middleware');
});

test('refund management list route requires auth and admin or merchant role middleware', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/refunds' && candidate.methods.get);

  assert.ok(route, 'refund list route should be registered');
  assert.equal(Boolean(route.methods.get), true);
  assert.equal(route.stack.length, 4, 'refund list should require auth, role and permission middleware');
});

test('refund export placeholder route requires refund list permission', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/refunds/export-placeholder');

  assert.ok(route, 'refund export placeholder route should be registered');
  assert.equal(Boolean(route.methods.get), true);
  assert.equal(route.stack.length, 4, 'refund export placeholder should require auth, role and permission middleware');
});

test('refund management detail route requires auth and admin or merchant role middleware', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/refunds/:id');

  assert.ok(route, 'refund detail route should be registered');
  assert.equal(Boolean(route.methods.get), true);
  assert.equal(route.stack.length, 4, 'refund detail should require auth, role and permission middleware');
});

test('refund review route requires auth middleware', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/refunds/:id/review');

  assert.ok(route, 'refund review route should be registered');
  assert.equal(Boolean(route.methods.put), true);
  assert.equal(route.stack.length, 4, 'refund review should require auth, role and permission middleware');
});

test('ship order route requires auth and admin or merchant role middleware', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/:id/ship');

  assert.ok(route, 'ship order route should be registered');
  assert.equal(Boolean(route.methods.put), true);
  assert.equal(route.stack.length, 4, 'ship order should require auth, role and permission middleware');
});

test('fulfillment order list route requires order ship permission', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/fulfillment/orders');

  assert.ok(route, 'fulfillment order list route should be registered');
  assert.equal(Boolean(route.methods.get), true);
  assert.equal(route.stack.length, 4, 'fulfillment order list should require auth, role and order ship permission middleware');
});

test('export job routes require export manage permission', () => {
  const routes = router.stack.map((layer) => layer.route).filter(Boolean);
  const listRoute = routes.find((candidate) => candidate.path === '/exports/jobs' && candidate.methods.get);
  const createRoute = routes.find((candidate) => candidate.path === '/exports/jobs' && candidate.methods.post);

  assert.ok(listRoute, 'export job list route should be registered');
  assert.ok(createRoute, 'export job create route should be registered');
  assert.equal(listRoute.stack.length, 4, 'export job list should require auth, role and permission middleware');
  assert.equal(createRoute.stack.length, 4, 'export job create should require auth, role and permission middleware');
});

test('operation log route requires operation log permission', () => {
  const route = router.stack
    .map((layer) => layer.route)
    .find((candidate) => candidate?.path === '/operations/logs');

  assert.ok(route, 'operation log route should be registered');
  assert.equal(Boolean(route.methods.get), true);
  assert.equal(route.stack.length, 4, 'operation log route should require auth, role and permission middleware');
});
