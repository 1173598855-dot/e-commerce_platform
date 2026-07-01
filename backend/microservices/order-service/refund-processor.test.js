const test = require('node:test');
const assert = require('node:assert/strict');

const { createRefundRequest, transitionRefundRequest } = require('./refund-processor');

function createFakeConnection({ orderRows, insertResult }) {
  const calls = [];
  return {
    calls,
    async beginTransaction() { calls.push(['beginTransaction']); },
    async commit() { calls.push(['commit']); },
    async rollback() { calls.push(['rollback']); },
    async execute(sql, params) {
      calls.push(['execute', sql, params]);
      if (sql.includes('FROM orders WHERE id = ? AND user_id = ?')) return [orderRows];
      if (sql.includes('INSERT INTO refund_requests')) return [insertResult];
      if (sql.includes('SELECT id, status FROM refund_requests')) return [[{ id: 99, status: 'requested' }]];
      return [{ affectedRows: 1 }];
    },
  };
}

test('createRefundRequest inserts requested refund for paid user order', async () => {
  const conn = createFakeConnection({
    orderRows: [{ id: 7, order_no: 'ORD7', user_id: 3, status: 'paid', total_amount: '88.00' }],
    insertResult: { affectedRows: 1, insertId: 42 },
  });

  const result = await createRefundRequest(conn, 3, {
    orderId: 7,
    refundType: 'full',
    reason: 'changed mind',
  });

  assert.deepEqual(result, { refundId: 42, orderId: 7, status: 'requested', duplicate: false });
  assert.equal(conn.calls.some((call) => call[1]?.includes('INSERT INTO refund_requests')), true);
  assert.equal(conn.calls.at(-1)[0], 'commit');
});

test('createRefundRequest returns existing request for duplicate idempotency key', async () => {
  const conn = createFakeConnection({
    orderRows: [{ id: 7, order_no: 'ORD7', user_id: 3, status: 'paid', total_amount: '88.00' }],
    insertResult: { affectedRows: 2, insertId: 0 },
  });

  const result = await createRefundRequest(conn, 3, {
    orderId: 7,
    refundType: 'full',
    reason: 'changed mind',
  });

  assert.deepEqual(result, { refundId: 99, orderId: 7, status: 'requested', duplicate: true });
  assert.equal(conn.calls.at(-1)[0], 'commit');
});

test('createRefundRequest rejects non-refundable order statuses', async () => {
  const conn = createFakeConnection({
    orderRows: [{ id: 7, order_no: 'ORD7', user_id: 3, status: 'pending', total_amount: '88.00' }],
    insertResult: { affectedRows: 1, insertId: 42 },
  });

  await assert.rejects(
    () => createRefundRequest(conn, 3, { orderId: 7, refundType: 'full', reason: 'changed mind' }),
    /Order status pending is not refundable/
  );
  assert.equal(conn.calls.at(-1)[0], 'rollback');
});

function createRefundTransitionConnection({ refundRows, evidenceRows = [] }) {
  const calls = [];
  return {
    calls,
    async beginTransaction() { calls.push(['beginTransaction']); },
    async commit() { calls.push(['commit']); },
    async rollback() { calls.push(['rollback']); },
    async execute(sql, params) {
      calls.push(['execute', sql, params]);
      if (sql.includes('FROM refund_requests WHERE id = ?')) return [refundRows];
      if (sql.includes('COUNT(DISTINCT p.merchant_id)')) return [[{ merchant_count: 1, unmatched_count: 0 }]];
      if (sql.includes('FROM refund_evidence WHERE refund_id = ?')) return [evidenceRows];
      return [{ affectedRows: 1 }];
    },
  };
}

test('transitionRefundRequest approves requested refund and records event', async () => {
  const conn = createRefundTransitionConnection({ refundRows: [{ id: 42, order_id: 7, status: 'requested' }] });

  const result = await transitionRefundRequest(conn, {
    refundId: 42,
    nextStatus: 'approved',
    operatorId: 9001,
    note: 'approved by ops',
  });

  assert.deepEqual(result, { refundId: 42, orderId: 7, status: 'approved' });
  assert.equal(conn.calls.some((call) => call[1]?.includes('UPDATE refund_requests SET status = ?')), true);
  assert.equal(conn.calls.some((call) => call[1]?.includes('INSERT INTO refund_events')), true);
  assert.equal(conn.calls.at(-1)[0], 'commit');
});

test('transitionRefundRequest blocks approval when refund evidence has not passed scanning', async () => {
  const conn = createRefundTransitionConnection({
    refundRows: [{ id: 42, order_id: 7, status: 'requested' }],
    evidenceRows: [{ id: 501, scan_status: 'pending' }, { id: 502, scan_status: 'passed' }],
  });

  await assert.rejects(
    () => transitionRefundRequest(conn, {
      refundId: 42,
      nextStatus: 'approved',
      operatorId: 9001,
      operatorRole: 'merchant',
      merchantId: 5,
    }),
    /Refund evidence scan must pass before approval/
  );

  assert.equal(conn.calls.some((call) => call[1]?.includes('UPDATE refund_requests SET status = ?')), false);
  assert.equal(conn.calls.at(-1)[0], 'rollback');
});

test('transitionRefundRequest lets admin bypass evidence scan block explicitly', async () => {
  const conn = createRefundTransitionConnection({
    refundRows: [{ id: 42, order_id: 7, status: 'requested' }],
    evidenceRows: [{ id: 501, scan_status: 'quarantined' }],
  });

  const result = await transitionRefundRequest(conn, {
    refundId: 42,
    nextStatus: 'approved',
    operatorId: 9001,
    operatorRole: 'admin',
    evidenceScanBypass: true,
    note: 'manual risk accepted',
  });

  assert.deepEqual(result, { refundId: 42, orderId: 7, status: 'approved' });
  assert.equal(conn.calls.some((call) => call[1]?.includes('UPDATE refund_requests SET status = ?')), true);
  const auditCall = conn.calls.find((call) => call[1]?.includes('INSERT INTO refund_review_audit_logs'));
  assert.ok(auditCall, 'manual evidence bypass should write a dedicated audit record');
  assert.deepEqual(auditCall[2], [42, 9001, 'admin', null, 'evidence_scan_bypass', 'approved', 'manual risk accepted', JSON.stringify([501])]);
  assert.equal(conn.calls.at(-1)[0], 'commit');
});

test('transitionRefundRequest requires a note when admin bypasses evidence scan block', async () => {
  const conn = createRefundTransitionConnection({
    refundRows: [{ id: 42, order_id: 7, status: 'requested' }],
    evidenceRows: [{ id: 501, scan_status: 'failed' }],
  });

  await assert.rejects(
    () => transitionRefundRequest(conn, {
      refundId: 42,
      nextStatus: 'approved',
      operatorId: 9001,
      operatorRole: 'admin',
      evidenceScanBypass: true,
    }),
    /evidence scan bypass note required/
  );

  assert.equal(conn.calls.some((call) => call[1]?.includes('UPDATE refund_requests SET status = ?')), false);
  assert.equal(conn.calls.at(-1)[0], 'rollback');
});

test('transitionRefundRequest rejects invalid transitions and rolls back', async () => {
  const conn = createRefundTransitionConnection({ refundRows: [{ id: 42, order_id: 7, status: 'requested' }] });

  await assert.rejects(
    () => transitionRefundRequest(conn, { refundId: 42, nextStatus: 'refunded', operatorId: 9001 }),
    /Invalid refund transition: requested -> refunded/
  );

  assert.equal(conn.calls.some((call) => call[1]?.includes('UPDATE refund_requests SET status = ?')), false);
  assert.equal(conn.calls.at(-1)[0], 'rollback');
});

test('transitionRefundRequest submits approved refund through provider before refunding', async () => {
  const conn = createRefundTransitionConnection({
    refundRows: [{ id: 42, order_id: 7, order_no: 'ORD7', amount: '88.00', status: 'approved' }],
  });
  const providerCalls = [];

  const result = await transitionRefundRequest(conn, {
    refundId: 42,
    nextStatus: 'refunding',
    operatorId: 9001,
    note: 'submit refund',
    refundProvider: async (payload) => {
      providerCalls.push(payload);
      return { provider: 'mock', providerRefundId: 'MOCK-REFUND-42' };
    },
  });

  assert.deepEqual(result, { refundId: 42, orderId: 7, status: 'refunding', provider: 'mock', providerRefundId: 'MOCK-REFUND-42' });
  assert.deepEqual(providerCalls, [{ refundId: 42, orderNo: 'ORD7', amount: '88.00', provider: undefined }]);
  assert.equal(conn.calls.some((call) => call[1]?.includes('provider_refund_id = ?')), true);
  assert.equal(conn.calls.at(-1)[0], 'commit');
});

test('transitionRefundRequest rejects merchant review for another merchant order', async () => {
  const calls = [];
  const conn = {
    calls,
    async beginTransaction() { calls.push(['beginTransaction']); },
    async commit() { calls.push(['commit']); },
    async rollback() { calls.push(['rollback']); },
    async execute(sql, params) {
      calls.push(['execute', sql, params]);
      if (sql.includes('FROM refund_requests WHERE id = ?')) return [[{ id: 42, order_id: 7, order_no: 'ORD7', amount: '88.00', status: 'requested' }]];
      if (sql.includes('COUNT(DISTINCT p.merchant_id)')) return [[{ merchant_count: 1, unmatched_count: 1 }]];
      return [{ affectedRows: 1 }];
    },
  };

  await assert.rejects(
    () => transitionRefundRequest(conn, {
      refundId: 42,
      nextStatus: 'approved',
      operatorId: 9001,
      operatorRole: 'merchant',
      merchantId: 9,
    }),
    /Refund request does not belong to merchant/
  );

  assert.equal(calls.some((call) => call[1]?.includes('UPDATE refund_requests SET status = ?')), false);
  assert.equal(calls.at(-1)[0], 'rollback');
});

test('transitionRefundRequest rejects merchant review without merchant scope', async () => {
  const conn = createRefundTransitionConnection({ refundRows: [{ id: 42, order_id: 7, status: 'requested' }] });

  await assert.rejects(
    () => transitionRefundRequest(conn, {
      refundId: 42,
      nextStatus: 'approved',
      operatorId: 9001,
      operatorRole: 'merchant',
    }),
    /merchantId required for merchant refund review/
  );

  assert.equal(conn.calls.some((call) => call[1]?.includes('UPDATE refund_requests SET status = ?')), false);
  assert.equal(conn.calls.at(-1)[0], 'rollback');
});
