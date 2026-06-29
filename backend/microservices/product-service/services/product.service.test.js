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
