const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-64-characters-for-auth-utils-test';

const jwt = require('jsonwebtoken');
const { buildAuthPayload, createAuthPayload } = require('./auth-utils');

test('buildAuthPayload returns accessToken and refreshToken contract', () => {
  const user = { id: 1, phone: '13800138000', nickname: 'Test User' };
  const payload = buildAuthPayload(user, {
    accessToken: 'access-token',
    refreshToken: 'refresh-token'
  });

  assert.deepEqual(payload, {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user
  });
  assert.equal(Object.prototype.hasOwnProperty.call(payload, 'token'), false);
});

test('createAuthPayload includes user role in access token', () => {
  const payload = createAuthPayload({ id: 2, phone: '13800138001', nickname: 'Ops', role: 'admin' });
  const decoded = jwt.decode(payload.accessToken);

  assert.equal(decoded.role, 'admin');
});

test('createAuthPayload includes merchant scope in access token', () => {
  const payload = createAuthPayload({ id: 3, phone: '13800138002', nickname: 'Seller', role: 'merchant', merchant_id: 12 });
  const decoded = jwt.decode(payload.accessToken);
  const refresh = jwt.decode(payload.refreshToken);

  assert.equal(decoded.merchantId, 12);
  assert.equal(refresh.merchantId, 12);
});

test('createAuthPayload includes database permissions in access and refresh tokens', () => {
  const payload = createAuthPayload({
    id: 4,
    phone: '13800138003',
    nickname: 'Ops',
    role: 'merchant',
    permissions: 'refund:list,order:ship,refund:list',
  });
  const decoded = jwt.decode(payload.accessToken);
  const refresh = jwt.decode(payload.refreshToken);

  assert.deepEqual(decoded.permissions, ['refund:list', 'order:ship']);
  assert.deepEqual(refresh.permissions, ['refund:list', 'order:ship']);
});

test('createAuthPayload includes permission version in access and refresh tokens', () => {
  const payload = createAuthPayload({
    id: 5,
    phone: '13800138004',
    nickname: 'Ops',
    role: 'merchant',
    permissions: ['refund:list'],
    permission_version: 7,
  });
  const decoded = jwt.decode(payload.accessToken);
  const refresh = jwt.decode(payload.refreshToken);

  assert.equal(decoded.permissionVersion, 7);
  assert.equal(refresh.permissionVersion, 7);
});

test('createAuthPayload defaults permission version to 1 when database version is absent', () => {
  const payload = createAuthPayload({ id: 6, phone: '13800138005', nickname: 'Ops', role: 'merchant' });
  const decoded = jwt.decode(payload.accessToken);
  const refresh = jwt.decode(payload.refreshToken);

  assert.equal(decoded.permissionVersion, 1);
  assert.equal(refresh.permissionVersion, 1);
});
