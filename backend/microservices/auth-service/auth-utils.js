const jwt = require('jsonwebtoken');
const { JWT_SECRET, generateToken } = require('../shared');

function createRefreshToken(user) {
  return jwt.sign(
    { userId: user.id, phone: user.phone || '', type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function buildAuthPayload(user, tokens) {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user,
  };
}

function createAuthPayload(user) {
  const accessToken = generateToken({ userId: user.id, phone: user.phone || '' });
  const refreshToken = createRefreshToken(user);
  return buildAuthPayload(user, { accessToken, refreshToken });
}

module.exports = { buildAuthPayload, createAuthPayload, createRefreshToken };
