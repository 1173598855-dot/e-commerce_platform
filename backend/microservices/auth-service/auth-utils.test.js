const test = require('node:test');
const assert = require('node:assert/strict');

const { buildAuthPayload } = require('./auth-utils');

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
