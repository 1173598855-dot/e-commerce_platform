const test = require('node:test');
const assert = require('node:assert/strict');

const { formatOrderList } = require('../services/order.service');

test('formatOrderList groups rows into orders with item snapshots', () => {
  const rows = [
    {
      id: 9,
      order_no: 'ORD9',
      total_amount: '100.00',
      status: 'pending',
      created_at: '2026-01-01 00:00:00',
      product_id: 1,
      quantity: 2,
      item_price: '50.00',
      subtotal: '100.00',
      product_name: 'Keyboard',
      product_image: 'keyboard.png',
    },
    {
      id: 9,
      order_no: 'ORD9',
      total_amount: '100.00',
      status: 'pending',
      created_at: '2026-01-01 00:00:00',
      product_id: 2,
      quantity: 1,
      item_price: '0.00',
      subtotal: '0.00',
      product_name: null,
      product_image: null,
    },
  ];

  assert.deepEqual(formatOrderList(rows, 1, 10, 1), {
    list: [
      {
        id: 9,
        order_no: 'ORD9',
        total_amount: '100.00',
        status: 'pending',
        created_at: '2026-01-01 00:00:00',
        items: [
          {
            product_id: 1,
            product_name: 'Keyboard',
            product_image: 'keyboard.png',
            quantity: 2,
            price: '50.00',
            subtotal: '100.00',
          },
        ],
      },
    ],
    pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  });
});
