const test = require('node:test');
const assert = require('node:assert/strict');

const { getForwardPath } = require('./route-utils');

test('strips legacy api service prefix before proxying', () => {
  assert.equal(getForwardPath('/api/products/hot', '/api/products'), '/hot');
  assert.equal(getForwardPath('/api/auth/password-login', '/api/auth'), '/password-login');
  assert.equal(getForwardPath('/api/orders', '/api/orders'), '/');
});

test('strips v1 api service prefix before proxying', () => {
  assert.equal(getForwardPath('/api/v1/products/12', '/api/products'), '/12');
  assert.equal(getForwardPath('/api/v1/categories', '/api/categories'), '/');
  assert.equal(getForwardPath('/api/v1/orders/cart/add', '/api/orders'), '/cart/add');
});

test('preserves query strings when rewriting proxy paths', () => {
  assert.equal(getForwardPath('/api/products?page=2&pageSize=10', '/api/products'), '/?page=2&pageSize=10');
  assert.equal(getForwardPath('/api/v1/search/suggestions?keyword=phone', '/api/search'), '/suggestions?keyword=phone');
});

test('prepends target service base paths when configured', () => {
  assert.equal(getForwardPath('/api/categories/3', '/api/categories', '/categories'), '/categories/3');
  assert.equal(getForwardPath('/api/v1/payments/mock', '/api/payments', '/payment'), '/payment/mock');
  assert.equal(getForwardPath('/api/data/overview', '/api/data', '/dashboard'), '/dashboard/overview');
});
