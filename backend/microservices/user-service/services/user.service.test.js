const test = require('node:test');
const assert = require('node:assert/strict');

const { formatUserAddressList } = require('../services/user.service');
const { resolveUserProductAssets } = require('../services/user.service');

test('formatUserAddressList returns pagination shape', () => {
  const rows = [{ id: 1 }, { id: 2 }];
  assert.deepEqual(formatUserAddressList(rows, 3, 15, 2), {
    list: rows,
    pagination: { page: 3, pageSize: 15, total: 2, totalPages: 1 },
  });
});

test('resolveUserProductAssets resolves product image URLs with ASSET_BASE_URL', () => {
  const previous = process.env.ASSET_BASE_URL;
  process.env.ASSET_BASE_URL = 'https://cdn.example.com';

  try {
    const rows = [{ id: 1, image: '/uploads/favorite.jpg' }];
    resolveUserProductAssets(rows);

    assert.equal(rows[0].image, 'https://cdn.example.com/uploads/favorite.jpg');
  } finally {
    if (previous === undefined) {
      delete process.env.ASSET_BASE_URL;
    } else {
      process.env.ASSET_BASE_URL = previous;
    }
  }
});
