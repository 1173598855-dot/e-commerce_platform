const test = require('node:test');
const assert = require('node:assert/strict');

const { buildOrderItem } = require('./order-utils');

test('buildOrderItem keeps product snapshot fields required by order_items', () => {
  const item = { product_id: 12, quantity: 3 };
  const product = {
    name: 'Test Phone',
    image: 'https://example.com/phone.png',
    price: '1999.00',
    stock: 10
  };

  assert.deepEqual(buildOrderItem(item, product), {
    product_id: 12,
    product_name: 'Test Phone',
    product_image: 'https://example.com/phone.png',
    quantity: 3,
    price: 1999,
    subtotal: 5997
  });
});
