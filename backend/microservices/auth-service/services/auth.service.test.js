const test = require('node:test');
const assert = require('node:assert/strict');

const { toPublicUser } = require('../services/auth.service');

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
