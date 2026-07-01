const test = require('node:test');
const assert = require('node:assert/strict');

const { processVerifiedPaymentCallback } = require('./payment-callback-processor');

function createFakeConnection({ insertResult, orderRows }) {
  const calls = [];
  return {
    calls,
    async beginTransaction() { calls.push(['beginTransaction']); },
    async commit() { calls.push(['commit']); },
    async rollback() { calls.push(['rollback']); },
    async execute(sql, params) {
      calls.push(['execute', sql, params]);
      if (sql.includes('INSERT INTO payment_callback_records')) return [insertResult];
      if (sql.includes('SELECT id, status FROM orders')) return [orderRows];
      return [{ affectedRows: 1 }];
    },
  };
}

test('processVerifiedPaymentCallback marks pending order paid on first callback', async () => {
  const conn = createFakeConnection({
    insertResult: { affectedRows: 1 },
    orderRows: [{ id: 7, status: 'pending' }],
  });

  const result = await processVerifiedPaymentCallback(conn, {
    idempotencyKey: 'payment-callback:mock:TX1',
    provider: 'mock',
    orderNo: 'ORD7',
    transactionId: 'TX1',
    paidAmount: '88.00',
  });

  assert.deepEqual(result, { orderId: 7, orderNo: 'ORD7', duplicate: false, status: 'paid' });
  assert.equal(conn.calls.some((call) => call[1]?.includes("UPDATE orders SET status = 'paid'")), true);
  assert.equal(conn.calls.at(-1)[0], 'commit');
});

test('processVerifiedPaymentCallback commits duplicate callback without updating order again', async () => {
  const conn = createFakeConnection({
    insertResult: { affectedRows: 2 },
    orderRows: [{ id: 7, status: 'paid' }],
  });

  const result = await processVerifiedPaymentCallback(conn, {
    idempotencyKey: 'payment-callback:mock:TX1',
    provider: 'mock',
    orderNo: 'ORD7',
    transactionId: 'TX1',
    paidAmount: '88.00',
  });

  assert.deepEqual(result, { orderId: 7, orderNo: 'ORD7', duplicate: true, status: 'paid' });
  assert.equal(conn.calls.some((call) => call[1]?.includes("UPDATE orders SET status = 'paid'")), false);
  assert.equal(conn.calls.at(-1)[0], 'commit');
});

test('processVerifiedPaymentCallback rolls back when order number is unknown', async () => {
  const conn = createFakeConnection({
    insertResult: { affectedRows: 1 },
    orderRows: [],
  });

  await assert.rejects(
    () => processVerifiedPaymentCallback(conn, {
      idempotencyKey: 'payment-callback:mock:TX1',
      provider: 'mock',
      orderNo: 'ORD404',
      transactionId: 'TX1',
      paidAmount: '88.00',
    }),
    /Order not found for payment callback: ORD404/
  );

  assert.equal(conn.calls.at(-1)[0], 'rollback');
});
