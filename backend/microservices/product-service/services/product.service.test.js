const test = require('node:test');
const assert = require('node:assert/strict');

const { formatProductList } = require('../services/product.service');

test('formatProductList keeps list and pagination shape', () => {
  const rows = [
    { id: 1, name: 'Phone', rating: '4.9', category_name: 'Phones' },
    { id: 2, name: 'Laptop', rating: '4.8', category_name: 'Computers' },
  ];

  assert.deepEqual(formatProductList(rows, 2, 20, 40), {
    list: rows,
    pagination: { page: 2, pageSize: 20, total: 40, totalPages: 2 },
  });
});

test('formatProductList resolves product image URLs with ASSET_BASE_URL', () => {
  const previous = process.env.ASSET_BASE_URL;
  process.env.ASSET_BASE_URL = 'https://cdn.example.com';

  try {
    const result = formatProductList([{ id: 1, name: 'Phone', image: '/uploads/phone.jpg' }], 1, 20, 1);

    assert.equal(result.list[0].image, 'https://cdn.example.com/uploads/phone.jpg');
  } finally {
    if (previous === undefined) {
      delete process.env.ASSET_BASE_URL;
    } else {
      process.env.ASSET_BASE_URL = previous;
    }
  }
});
