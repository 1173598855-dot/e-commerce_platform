const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveAssetUrl } = require('./asset-url');

function withEnv(values, fn) {
  const previous = { ASSET_BASE_URL: process.env.ASSET_BASE_URL };
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    fn();
  } finally {
    if (previous.ASSET_BASE_URL === undefined) {
      delete process.env.ASSET_BASE_URL;
    } else {
      process.env.ASSET_BASE_URL = previous.ASSET_BASE_URL;
    }
  }
}

test('resolveAssetUrl returns existing absolute URLs unchanged', () => {
  withEnv({ ASSET_BASE_URL: 'https://cdn.example.com' }, () => {
    assert.equal(resolveAssetUrl('https://img.example.com/a.jpg'), 'https://img.example.com/a.jpg');
    assert.equal(resolveAssetUrl('http://img.example.com/a.jpg'), 'http://img.example.com/a.jpg');
  });
});

test('resolveAssetUrl prefixes relative upload paths with ASSET_BASE_URL', () => {
  withEnv({ ASSET_BASE_URL: 'https://cdn.example.com/assets/' }, () => {
    assert.equal(resolveAssetUrl('/uploads/a.jpg'), 'https://cdn.example.com/assets/uploads/a.jpg');
    assert.equal(resolveAssetUrl('uploads/b.jpg'), 'https://cdn.example.com/assets/uploads/b.jpg');
  });
});

test('resolveAssetUrl leaves relative paths unchanged when ASSET_BASE_URL is not configured', () => {
  withEnv({ ASSET_BASE_URL: '' }, () => {
    assert.equal(resolveAssetUrl('/uploads/a.jpg'), '/uploads/a.jpg');
    assert.equal(resolveAssetUrl('uploads/b.jpg'), 'uploads/b.jpg');
  });
});
