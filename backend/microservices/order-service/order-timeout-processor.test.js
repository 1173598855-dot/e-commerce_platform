const test = require('node:test');
const assert = require('node:assert/strict');

const { expirePendingOrders } = require('./order-timeout-processor');

function createFakeConnection({ orders, itemsByOrderId, cancelAffectedRows = 1 }) {
  const calls = [];
  return {
    calls,
    async beginTransaction() { calls.push(['beginTransaction']); },
    async commit() { calls.push(['commit']); },
    async rollback() { calls.push(['rollback']); },
    async execute(sql, params) {
      calls.push(['execute', sql, params]);
      if (sql.includes("FROM orders WHERE status = 'pending'")) return [orders];
      if (sql.includes('FROM order_items WHERE order_id = ?')) return [itemsByOrderId[params[0]] || []];
      if (sql.includes("UPDATE orders SET status = 'cancelled'")) return [{ affectedRows: cancelAffectedRows }];
      return [{ affectedRows: 1 }];
    },
  };
}

test('expirePendingOrders cancels expired pending orders and restores stock once', async () => {
  const conn = createFakeConnection({
    orders: [{ id: 7, order_no: 'ORD7' }],
    itemsByOrderId: { 7: [{ product_id: 3, quantity: 2 }, { product_id: 4, quantity: 1 }] },
  });

  const result = await expirePendingOrders(conn, { olderThanMinutes: 30, limit: 20 });

  assert.deepEqual(result, { expired: 1, orderIds: [7] });
  assert.equal(conn.calls.some((call) => call[1]?.includes("UPDATE orders SET status = 'cancelled'")), true);
  assert.equal(conn.calls.filter((call) => call[1]?.includes('UPDATE products SET stock = stock + ?')).length, 2);
  assert.equal(conn.calls.at(-1)[0], 'commit');
});

test('expirePendingOrders does not restore stock when conditional cancel does not update', async () => {
  const conn = createFakeConnection({
    orders: [{ id: 7, order_no: 'ORD7' }],
    itemsByOrderId: { 7: [{ product_id: 3, quantity: 2 }] },
    cancelAffectedRows: 0,
  });

  const result = await expirePendingOrders(conn, { olderThanMinutes: 30, limit: 20 });

  assert.deepEqual(result, { expired: 0, orderIds: [] });
  assert.equal(conn.calls.some((call) => call[1]?.includes('UPDATE products SET stock = stock + ?')), false);
  assert.equal(conn.calls.at(-1)[0], 'commit');
});

test('expirePendingOrders rolls back on unexpected database errors', async () => {
  const conn = {
    calls: [],
    async beginTransaction() { this.calls.push(['beginTransaction']); },
    async commit() { this.calls.push(['commit']); },
    async rollback() { this.calls.push(['rollback']); },
    async execute() { throw new Error('db down'); },
  };

  await assert.rejects(() => expirePendingOrders(conn, { olderThanMinutes: 30, limit: 20 }), /db down/);
  assert.equal(conn.calls.at(-1)[0], 'rollback');
});
