const test = require('node:test');
const assert = require('node:assert/strict');

const { processVerifiedRefundCallback } = require('./refund-callback-processor');

function createFakeConnection({ insertResult, refundRows }) {
  const calls = [];
  return {
    calls,
    async beginTransaction() { calls.push(['beginTransaction']); },
    async commit() { calls.push(['commit']); },
    async rollback() { calls.push(['rollback']); },
    async execute(sql, params) {
      calls.push(['execute', sql, params]);
      if (sql.includes('INSERT INTO refund_callback_records')) return [insertResult];
      if (sql.includes('FROM refund_requests WHERE')) return [refundRows];
      return [{ affectedRows: 1 }];
    },
  };
}

test('processVerifiedRefundCallback marks refunding request refunded on first success callback', async () => {
  const conn = createFakeConnection({
    insertResult: { affectedRows: 1 },
    refundRows: [{ id: 42, order_id: 7, status: 'refunding' }],
  });

  const result = await processVerifiedRefundCallback(conn, {
    idempotencyKey: 'refund-callback:mock:MOCK-REFUND-42',
    provider: 'mock',
    refundId: 42,
    providerRefundId: 'MOCK-REFUND-42',
    status: 'refunded',
    failedReason: '',
  });

  assert.deepEqual(result, { refundId: 42, orderId: 7, duplicate: false, status: 'refunded' });
  assert.equal(conn.calls.some((call) => call[1]?.includes("UPDATE refund_requests SET status = ?")), true);
  const eventCall = conn.calls.find((call) => call[1]?.includes('INSERT INTO refund_events'));
  assert.ok(eventCall);
  assert.equal(eventCall[2][3], null);
  assert.equal(conn.calls.at(-1)[0], 'commit');
});

test('processVerifiedRefundCallback commits duplicate callback without updating refund again', async () => {
  const conn = createFakeConnection({
    insertResult: { affectedRows: 2 },
    refundRows: [{ id: 42, order_id: 7, status: 'refunded' }],
  });

  const result = await processVerifiedRefundCallback(conn, {
    idempotencyKey: 'refund-callback:mock:MOCK-REFUND-42',
    provider: 'mock',
    refundId: 42,
    providerRefundId: 'MOCK-REFUND-42',
    status: 'refunded',
    failedReason: '',
  });

  assert.deepEqual(result, { refundId: 42, orderId: 7, duplicate: true, status: 'refunded' });
  assert.equal(conn.calls.some((call) => call[1]?.includes("UPDATE refund_requests SET status = ?")), false);
  assert.equal(conn.calls.some((call) => call[1]?.includes('INSERT INTO refund_events')), false);
  assert.equal(conn.calls.at(-1)[0], 'commit');
});

test('processVerifiedRefundCallback records failed provider callback reason', async () => {
  const conn = createFakeConnection({
    insertResult: { affectedRows: 1 },
    refundRows: [{ id: 42, order_id: 7, status: 'refunding' }],
  });

  const result = await processVerifiedRefundCallback(conn, {
    idempotencyKey: 'refund-callback:mock:MOCK-REFUND-42',
    provider: 'mock',
    refundId: 42,
    providerRefundId: 'MOCK-REFUND-42',
    status: 'failed',
    failedReason: 'provider rejected',
  });

  assert.deepEqual(result, { refundId: 42, orderId: 7, duplicate: false, status: 'failed' });
  const updateCall = conn.calls.find((call) => call[1]?.includes('failed_reason = ?'));
  assert.ok(updateCall);
  assert.equal(updateCall[2][1], 'provider rejected');
  assert.equal(conn.calls.at(-1)[0], 'commit');
});

test('processVerifiedRefundCallback rolls back when refund request is unknown', async () => {
  const conn = createFakeConnection({ insertResult: { affectedRows: 1 }, refundRows: [] });

  await assert.rejects(
    () => processVerifiedRefundCallback(conn, {
      idempotencyKey: 'refund-callback:mock:UNKNOWN',
      provider: 'mock',
      refundId: 404,
      providerRefundId: 'UNKNOWN',
      status: 'refunded',
    }),
    /Refund request not found for refund callback: 404/
  );

  assert.equal(conn.calls.at(-1)[0], 'rollback');
});
