const test = require('node:test');
const assert = require('node:assert/strict');

const { formatUserAddressList } = require('../services/user.service');

test('formatUserAddressList returns pagination shape', () => {
  const rows = [{ id: 1 }, { id: 2 }];
  assert.deepEqual(formatUserAddressList(rows, 3, 15, 2), {
    list: rows,
    pagination: { page: 3, pageSize: 15, total: 2, totalPages: 1 },
  });
});
