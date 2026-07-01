const test = require('node:test');
const assert = require('node:assert/strict');

const { OrderService, formatOrderList } = require('../services/order.service');

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

test('formatOrderList resolves product image URLs with ASSET_BASE_URL', () => {
  const previous = process.env.ASSET_BASE_URL;
  process.env.ASSET_BASE_URL = 'https://cdn.example.com';

  try {
    const result = formatOrderList([
      {
        id: 10,
        order_no: 'ORD10',
        total_amount: '20.00',
        status: 'paid',
        created_at: '2026-01-01 00:00:00',
        product_id: 3,
        quantity: 1,
        item_price: '20.00',
        subtotal: '20.00',
        product_name: 'Mouse',
        product_image: '/uploads/mouse.jpg',
      },
    ], 1, 10, 1);

    assert.equal(result.list[0].items[0].product_image, 'https://cdn.example.com/uploads/mouse.jpg');
  } finally {
    if (previous === undefined) {
      delete process.env.ASSET_BASE_URL;
    } else {
      process.env.ASSET_BASE_URL = previous;
    }
  }
});

test('applyPaymentCallback processes verified callback through a pooled transaction', async () => {
  const connection = {
    released: false,
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    async execute(sql) {
      if (sql.includes('INSERT INTO payment_callback_records')) return [{ affectedRows: 1 }];
      if (sql.includes('SELECT id, status FROM orders')) return [[{ id: 11, status: 'pending' }]];
      return [{ affectedRows: 1 }];
    },
    release() { this.released = true; },
  };
  const service = new OrderService({ getConnection: async () => connection });

  const result = await service.applyPaymentCallback({
    idempotencyKey: 'payment-callback:mock:TX11',
    provider: 'mock',
    orderNo: 'ORD11',
    transactionId: 'TX11',
    paidAmount: '18.00',
  });

  assert.deepEqual(result, { orderId: 11, orderNo: 'ORD11', duplicate: false, status: 'paid' });
  assert.equal(connection.released, true);
});

test('applyRefundCallback processes verified callback through a pooled transaction', async () => {
  const connection = {
    released: false,
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    async execute(sql) {
      if (sql.includes('INSERT INTO refund_callback_records')) return [{ affectedRows: 1 }];
      if (sql.includes('FROM refund_requests WHERE')) return [[{ id: 77, order_id: 14, status: 'refunding' }]];
      return [{ affectedRows: 1 }];
    },
    release() { this.released = true; },
  };
  const service = new OrderService({ getConnection: async () => connection });

  const result = await service.applyRefundCallback({
    idempotencyKey: 'refund-callback:mock:MOCK-REFUND-77',
    provider: 'mock',
    refundId: 77,
    providerRefundId: 'MOCK-REFUND-77',
    status: 'refunded',
  });

  assert.deepEqual(result, { refundId: 77, orderId: 14, duplicate: false, status: 'refunded' });
  assert.equal(connection.released, true);
});

test('expirePendingOrders releases pooled transaction connection', async () => {
  const connection = {
    released: false,
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    async execute(sql) {
      if (sql.includes("FROM orders WHERE status = 'pending'")) return [[{ id: 12, order_no: 'ORD12' }]];
      if (sql.includes("UPDATE orders SET status = 'cancelled'")) return [{ affectedRows: 1 }];
      if (sql.includes('FROM order_items WHERE order_id = ?')) return [[{ product_id: 5, quantity: 2 }]];
      return [{ affectedRows: 1 }];
    },
    release() { this.released = true; },
  };
  const service = new OrderService({ getConnection: async () => connection });

  const result = await service.expirePendingOrders({ olderThanMinutes: 30, limit: 20 });

  assert.deepEqual(result, { expired: 1, orderIds: [12] });
  assert.equal(connection.released, true);
});

test('requestRefund releases pooled transaction connection', async () => {
  const connection = {
    released: false,
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    async execute(sql) {
      if (sql.includes('FROM orders WHERE id = ? AND user_id = ?')) return [[{ id: 14, order_no: 'ORD14', status: 'paid', total_amount: '33.00' }]];
      if (sql.includes('INSERT INTO refund_requests')) return [{ affectedRows: 1, insertId: 77 }];
      return [{ affectedRows: 1 }];
    },
    release() { this.released = true; },
  };
  const service = new OrderService({ getConnection: async () => connection });

  const result = await service.requestRefund(3, { orderId: 14, refundType: 'full', reason: 'test' });

  assert.deepEqual(result, { refundId: 77, orderId: 14, status: 'requested', duplicate: false });
  assert.equal(connection.released, true);
});

test('addRefundEvidence inserts customer evidence for own refund request', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('FROM refund_requests WHERE id = ? AND user_id = ?')) return [[{ id: 77 }]];
      if (sql.includes('INSERT INTO refund_evidence')) return [{ insertId: 501 }];
      return [[]];
    },
  });

  const result = await service.addRefundEvidence(3, 77, {
    url: '/uploads/refunds/photo.jpg',
    type: 'image',
    description: 'broken item',
    objectKey: 'refund-evidence/77/3/photo.jpg',
    contentType: 'image/jpeg',
    fileSize: 512,
    checksum: 'sha256:abc123',
    retentionDays: 180,
  });

  assert.deepEqual(result, { evidenceId: 501, refundId: 77 });
  assert.equal(calls.some((call) => call[1].includes('INSERT INTO refund_evidence')), true);
  const insertCall = calls.find((call) => call[1].includes('INSERT INTO refund_evidence'));
  assert.equal(insertCall[1].includes('retention_policy'), true);
  assert.equal(insertCall[1].includes('retention_expires_at'), true);
  assert.deepEqual(insertCall[2], [77, 3, 'image', '/uploads/refunds/photo.jpg', 'broken item', 'refund-evidence/77/3/photo.jpg', 'image/jpeg', 512, 'sha256:abc123', 'pending', '', 'standard', 180, 180]);
});

test('addRefundEvidence rejects evidence for refund requests owned by another user', async () => {
  const service = new OrderService({
    async query(sql) {
      if (sql.includes('FROM refund_requests WHERE id = ? AND user_id = ?')) return [[]];
      return [[]];
    },
  });

  await assert.rejects(
    () => service.addRefundEvidence(3, 77, { url: '/uploads/refunds/photo.jpg', type: 'image' }),
    /Refund request not found/
  );
});

test('createRefundEvidenceUploadIntent validates ownership before returning upload intent', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('FROM refund_requests WHERE id = ? AND user_id = ?')) return [[{ id: 77 }]];
      return [[]];
    },
  });

  const result = await service.createRefundEvidenceUploadIntent(3, 77, {
    fileName: 'proof.jpg',
    contentType: 'image/jpeg',
    fileSize: 512,
  });

  assert.equal(result.provider, 'mock');
  assert.equal(result.headers['content-type'], 'image/jpeg');
  assert.match(result.objectKey, /^refund-evidence\/77\/3\//);
  assert.equal(calls.some((call) => call[1].includes('FROM refund_requests WHERE id = ? AND user_id = ?')), true);
});

test('createRefundEvidenceUploadIntent rejects another user refund request', async () => {
  const service = new OrderService({
    async query(sql) {
      if (sql.includes('FROM refund_requests WHERE id = ? AND user_id = ?')) return [[]];
      return [[]];
    },
  });

  await assert.rejects(
    () => service.createRefundEvidenceUploadIntent(3, 77, { fileName: 'proof.jpg', contentType: 'image/jpeg', fileSize: 512 }),
    /Refund request not found/
  );
});

test('updateRefundEvidenceScan records scanner result for evidence', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('SELECT id, refund_id FROM refund_evidence')) return [[{ id: 501, refund_id: 77 }]];
      if (sql.includes('UPDATE refund_evidence SET scan_status')) return [{ affectedRows: 1 }];
      return [[]];
    },
  });

  const result = await service.updateRefundEvidenceScan(
    { userId: 9001, role: 'admin' },
    501,
    { status: 'passed', result: 'clean' }
  );

  assert.deepEqual(result, { evidenceId: 501, refundId: 77, scanStatus: 'passed', scanResult: 'clean' });
  assert.equal(calls.some((call) => call[1].includes('UPDATE refund_evidence SET scan_status')), true);
  assert.equal(calls.some((call) => call[1].includes('INSERT INTO operation_logs')), true);
});

test('updateRefundEvidenceScan stores scanner provided scan time', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('SELECT id, refund_id FROM refund_evidence')) return [[{ id: 501, refund_id: 77 }]];
      if (sql.includes('UPDATE refund_evidence SET scan_status')) return [{ affectedRows: 1 }];
      return [[]];
    },
  });

  await service.updateRefundEvidenceScan(
    { userId: 'scanner', role: 'system' },
    501,
    { status: 'passed', result: 'clean', scannedAt: '2026-07-01T10:00:00.000Z' }
  );

  const updateCall = calls.find((call) => call[1].includes('UPDATE refund_evidence SET scan_status'));
  assert.equal(updateCall[1].includes('scanned_at = ?'), true);
  assert.deepEqual(updateCall[2], ['passed', 'clean', '2026-07-01T10:00:00.000Z', 501]);
});

test('updateRefundEvidenceScan ignores duplicate signed scanner callbacks by idempotency key', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('INSERT INTO refund_evidence_scan_callback_records')) return [{ affectedRows: 2 }];
      if (sql.includes('SELECT id, refund_id FROM refund_evidence')) return [[{ id: 501, refund_id: 77 }]];
      return [[]];
    },
  });

  const result = await service.updateRefundEvidenceScan(
    { userId: 'scanner', role: 'system' },
    501,
    { status: 'passed', result: 'clean', idempotencyKey: 'scan-callback-501-1', rawPayload: { evidenceId: 501 } }
  );

  assert.deepEqual(result, { evidenceId: 501, refundId: 77, scanStatus: 'passed', scanResult: 'clean', duplicate: true });
  assert.equal(calls.some((call) => call[1].includes('UPDATE refund_evidence SET scan_status')), false);
});

test('updateRefundEvidenceScan rejects unsupported scan status', async () => {
  const service = new OrderService({ query: async () => [[]] });

  await assert.rejects(
    () => service.updateRefundEvidenceScan({ userId: 9001, role: 'admin' }, 501, { status: 'unknown' }),
    /Unsupported evidence scan status: unknown/
  );
});

test('reviewRefund releases pooled transaction connection', async () => {
  const connection = {
    released: false,
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    async execute(sql) {
      if (sql.includes('FROM refund_requests WHERE id = ?')) return [[{ id: 77, order_id: 14, status: 'requested' }]];
      if (sql.includes('COUNT(DISTINCT p.merchant_id)')) return [[{ merchant_count: 1, unmatched_count: 0 }]];
      if (sql.includes('FROM refund_evidence WHERE refund_id = ?')) return [[]];
      return [{ affectedRows: 1 }];
    },
    release() { this.released = true; },
  };
  const service = new OrderService({ getConnection: async () => connection });

  const result = await service.reviewRefund({ userId: 9001, role: 'merchant', merchantId: 5 }, 77, { status: 'approved', note: 'ok' });

  assert.deepEqual(result, { refundId: 77, orderId: 14, status: 'approved' });
  assert.equal(connection.released, true);
});

test('reviewRefund forwards admin evidence scan bypass to refund transition', async () => {
  const connection = {
    calls: [],
    released: false,
    async beginTransaction() { this.calls.push(['beginTransaction']); },
    async commit() { this.calls.push(['commit']); },
    async rollback() { this.calls.push(['rollback']); },
    async execute(sql, params) {
      this.calls.push(['execute', sql, params]);
      if (sql.includes('FROM refund_requests WHERE id = ?')) return [[{ id: 77, order_id: 14, status: 'requested' }]];
      if (sql.includes('FROM refund_evidence WHERE refund_id = ?')) return [[{ id: 501, scan_status: 'failed' }]];
      return [{ affectedRows: 1 }];
    },
    release() { this.released = true; },
  };
  const service = new OrderService({ getConnection: async () => connection });

  const result = await service.reviewRefund(
    { userId: 9001, role: 'admin' },
    77,
    { status: 'approved', evidenceScanBypass: true, note: 'manual risk accepted' }
  );

  assert.deepEqual(result, { refundId: 77, orderId: 14, status: 'approved' });
  assert.equal(connection.calls.some((call) => call[1]?.includes('FROM refund_evidence WHERE refund_id = ?')), true);
  assert.equal(connection.calls.some((call) => call[1]?.includes('INSERT INTO refund_review_audit_logs')), true);
  assert.equal(connection.released, true);
});

test('reviewRefund records an operation log for successful review decisions', async () => {
  const connection = {
    calls: [],
    released: false,
    async beginTransaction() { this.calls.push(['beginTransaction']); },
    async commit() { this.calls.push(['commit']); },
    async rollback() { this.calls.push(['rollback']); },
    async execute(sql, params) {
      this.calls.push(['execute', sql, params]);
      if (sql.includes('FROM refund_requests WHERE id = ?')) return [[{ id: 77, order_id: 14, status: 'requested' }]];
      if (sql.includes('COUNT(DISTINCT p.merchant_id)')) return [[{ merchant_count: 1, unmatched_count: 0 }]];
      if (sql.includes('FROM refund_evidence WHERE refund_id = ?')) return [[]];
      return [{ affectedRows: 1, insertId: 901 }];
    },
    release() { this.released = true; },
  };
  const service = new OrderService({ getConnection: async () => connection });

  const result = await service.reviewRefund(
    { userId: 9002, role: 'merchant', merchantId: 5 },
    77,
    { status: 'approved', note: 'approved after checking photos' }
  );

  const operationLogCall = connection.calls.find((call) => call[1]?.includes('INSERT INTO operation_logs'));
  assert.deepEqual(result, { refundId: 77, orderId: 14, status: 'approved' });
  assert.ok(operationLogCall);
  assert.equal(operationLogCall[1].includes("'refund.review.updated'"), true);
  assert.equal(operationLogCall[1].includes("'refund_request'"), true);
  assert.equal(operationLogCall[2][3], '77');
  assert.match(operationLogCall[2][4], /"status":"approved"/);
  assert.match(operationLogCall[2][4], /"notePresent":true/);
  assert.equal(connection.released, true);
});

function createShipConnection({ orderRows, ownershipRows = [{ merchant_count: 1, unmatched_count: 0 }], trackingRows = [] }) {
  const calls = [];
  return {
    calls,
    released: false,
    async beginTransaction() { calls.push(['beginTransaction']); },
    async commit() { calls.push(['commit']); },
    async rollback() { calls.push(['rollback']); },
    async execute(sql, params) {
      calls.push(['execute', sql, params]);
      if (sql.includes('FROM orders WHERE id = ? FOR UPDATE')) return [orderRows];
      if (sql.includes('COUNT(DISTINCT p.merchant_id)')) return [ownershipRows];
      if (sql.includes('SELECT id FROM logistics_tracking')) return [trackingRows];
      return [{ affectedRows: 1, insertId: 3001 }];
    },
    release() { this.released = true; },
  };
}

test('shipOrder lets admin ship a paid order and creates logistics tracking', async () => {
  const connection = createShipConnection({ orderRows: [{ id: 88, status: 'paid' }] });
  const service = new OrderService({ getConnection: async () => connection });

  const result = await service.shipOrder(
    { userId: 9001, role: 'admin' },
    88,
    { trackingCompany: 'SF', trackingNumber: 'SF123456' }
  );

  assert.deepEqual(result, { orderId: 88, status: 'shipped', trackingCompany: 'SF', trackingNumber: 'SF123456' });
  assert.equal(connection.calls.some((call) => call[1]?.includes("UPDATE orders SET status = 'shipped'")), true);
  assert.equal(connection.calls.some((call) => call[1]?.includes('INSERT INTO logistics_tracking')), true);
  assert.equal(connection.calls.some((call) => call[1]?.includes('INSERT INTO operation_logs')), true);
  assert.equal(connection.released, true);
});

test('shipOrder lets merchant ship an order containing only own products', async () => {
  const connection = createShipConnection({ orderRows: [{ id: 89, status: 'paid' }] });
  const service = new OrderService({ getConnection: async () => connection });

  const result = await service.shipOrder(
    { userId: 9002, role: 'merchant', merchantId: 5 },
    89,
    { trackingCompany: 'JD', trackingNumber: 'JD123' }
  );

  assert.deepEqual(result, { orderId: 89, status: 'shipped', trackingCompany: 'JD', trackingNumber: 'JD123' });
  assert.equal(connection.calls.some((call) => call[1]?.includes('COUNT(DISTINCT p.merchant_id)')), true);
});

test('shipOrder rejects merchant shipping another merchant order', async () => {
  const connection = createShipConnection({
    orderRows: [{ id: 90, status: 'paid' }],
    ownershipRows: [{ merchant_count: 1, unmatched_count: 1 }],
  });
  const service = new OrderService({ getConnection: async () => connection });

  await assert.rejects(
    () => service.shipOrder({ userId: 9002, role: 'merchant', merchantId: 5 }, 90, { trackingCompany: 'SF', trackingNumber: 'SF999' }),
    /Merchant cannot ship orders containing products outside own scope/
  );

  assert.equal(connection.calls.some((call) => call[1]?.includes("UPDATE orders SET status = 'shipped'")), false);
  assert.equal(connection.calls.some((call) => call[0] === 'rollback'), true);
});

test('shipOrder rejects unpaid order status', async () => {
  const connection = createShipConnection({ orderRows: [{ id: 91, status: 'pending' }] });
  const service = new OrderService({ getConnection: async () => connection });

  await assert.rejects(
    () => service.shipOrder({ userId: 9001, role: 'admin' }, 91, { trackingCompany: 'SF', trackingNumber: 'SF000' }),
    /Order status pending cannot be shipped/
  );

  assert.equal(connection.calls.some((call) => call[1]?.includes("UPDATE orders SET status = 'shipped'")), false);
});

test('shipOrder updates existing logistics tracking for resubmitted shipment details', async () => {
  const connection = createShipConnection({
    orderRows: [{ id: 92, status: 'paid' }],
    trackingRows: [{ id: 3001 }],
  });
  const service = new OrderService({ getConnection: async () => connection });

  await service.shipOrder({ userId: 9001, role: 'admin' }, 92, { trackingCompany: 'SF', trackingNumber: 'SF222' });

  assert.equal(connection.calls.some((call) => call[1]?.includes('UPDATE logistics_tracking SET')), true);
  assert.equal(connection.calls.some((call) => call[1]?.includes('INSERT INTO logistics_tracking')), false);
});

test('listFulfillmentOrders returns paged admin shipment records with local tracking snapshot', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('COUNT(DISTINCT o.id)')) return [[{ count: 1 }]];
      return [[{
        id: 88,
        order_no: 'ORD88',
        user_id: 3,
        total_amount: '120.00',
        status: 'paid',
        created_at: '2026-07-01 10:00:00',
        tracking_company: null,
        tracking_number: null,
        tracking_status: null,
        product_name: 'Phone case',
        quantity: 2,
      }]];
    },
  });

  const result = await service.listFulfillmentOrders({ userId: 9001, role: 'admin' }, { status: 'paid', page: '1', pageSize: '20' });

  assert.equal(result.list.length, 1);
  assert.deepEqual(result.pagination, { page: 1, pageSize: 20, total: 1, totalPages: 1 });
  assert.equal(result.list[0].order_no, 'ORD88');
  assert.equal(result.list[0].items.length, 1);
  assert.equal(calls.some((call) => call[1].includes('LEFT JOIN logistics_tracking')), true);
  assert.equal(calls.some((call) => call[1].includes('o.status = ?')), true);
});

test('listFulfillmentOrders scopes merchant records by product merchant ownership', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('COUNT(DISTINCT o.id)')) return [[{ count: 0 }]];
      return [[]];
    },
  });

  await service.listFulfillmentOrders({ userId: 9002, role: 'merchant', merchantId: 5 }, {});

  assert.equal(calls.some((call) => call[1].includes('p.merchant_id = ?')), true);
  assert.equal(calls.every((call) => call[2].includes(5)), true);
});

test('listRefunds returns paged refund records for admin', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('COUNT(DISTINCT rr.id)')) return [[{ count: 1 }]];
      return [[{
        id: 77,
        order_id: 14,
        order_no: 'ORD14',
        user_id: 3,
        refund_type: 'full',
        amount: '33.00',
        reason: 'bad item',
        status: 'requested',
        provider: null,
        provider_refund_id: null,
        created_at: '2026-01-01 00:00:00',
        updated_at: '2026-01-01 00:00:00',
        total_amount: '33.00',
        order_status: 'paid',
      }]];
    },
  });

  const result = await service.listRefunds({ userId: 9001, role: 'admin' }, { status: 'requested', page: '2', pageSize: '20' });

  assert.equal(result.list.length, 1);
  assert.deepEqual(result.pagination, { page: 2, pageSize: 20, total: 1, totalPages: 1 });
  assert.equal(calls.some((call) => call[1].includes('rr.status = ?')), true);
  assert.equal(calls.some((call) => call[1].includes('p.merchant_id = ?')), false);
});

test('listRefunds scopes merchant records by product merchant ownership', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('COUNT(DISTINCT rr.id)')) return [[{ count: 0 }]];
      return [[]];
    },
  });

  await service.listRefunds({ userId: 9002, role: 'merchant', merchantId: 5 }, {});

  assert.equal(calls.some((call) => call[1].includes('p.merchant_id = ?')), true);
  assert.equal(calls.every((call) => call[2].includes(5)), true);
});

test('listRefunds rejects merchant without merchant scope', async () => {
  const service = new OrderService({ query: async () => [[]] });

  await assert.rejects(
    () => service.listRefunds({ userId: 9002, role: 'merchant' }, {}),
    /merchantId required for merchant refund list/
  );
});

test('exportRefundsPlaceholder reports filtered refund count without generating a file', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('COUNT(DISTINCT rr.id)')) return [[{ count: 3 }]];
      return [[]];
    },
  });

  const result = await service.exportRefundsPlaceholder(
    { userId: 9001, role: 'admin' },
    { status: 'requested', keyword: 'ORD', format: 'csv' }
  );

  assert.equal(result.status, 'placeholder');
  assert.equal(result.generated, false);
  assert.equal(result.total, 3);
  assert.deepEqual(result.filters, { status: 'requested', keyword: 'ORD' });
  assert.equal(calls.some((call) => call[1].includes('rr.order_no LIKE ? OR rr.reason LIKE ?')), true);
});

test('createExportJobPlaceholder writes export job and operation log without generating a file', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('INSERT INTO export_jobs')) return [{ insertId: 701 }];
      if (sql.includes('INSERT INTO operation_logs')) return [{ insertId: 801 }];
      return [[]];
    },
  });

  const result = await service.createExportJobPlaceholder(
    { userId: 9002, role: 'merchant', merchantId: 5 },
    { exportType: 'refunds', filters: { status: 'requested' } }
  );

  assert.deepEqual(result, {
    id: 701,
    exportType: 'refunds',
    status: 'placeholder',
    generated: false,
    fileUrl: '',
    message: 'Export job recorded locally; file generation is not enabled yet.',
  });
  assert.equal(calls.some((call) => call[1].includes('INSERT INTO export_jobs')), true);
  assert.equal(calls.some((call) => call[1].includes('INSERT INTO operation_logs')), true);
});

test('listExportJobs scopes merchant export jobs to merchant id', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('COUNT(*) AS count')) return [[{ count: 1 }]];
      return [[{ id: 701, export_type: 'refunds', status: 'placeholder', file_url: '', message: 'pending', created_at: '2026-07-01' }]];
    },
  });

  const result = await service.listExportJobs({ userId: 9002, role: 'merchant', merchantId: 5 }, { exportType: 'refunds' });

  assert.equal(result.list.length, 1);
  assert.deepEqual(result.pagination, { page: 1, pageSize: 20, total: 1, totalPages: 1 });
  assert.equal(calls.some((call) => call[1].includes('merchant_id = ?')), true);
  assert.equal(calls.every((call) => call[2].includes(5)), true);
});

test('getRefundEvidenceRetentionCleanupDryRun returns expired evidence candidates without mutating rows', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('COUNT(*) AS count')) return [[{ count: 1 }]];
      return [[{
        id: 501,
        refund_id: 77,
        user_id: 3,
        evidence_type: 'image',
        url: '/uploads/refunds/photo.jpg',
        object_key: 'refund-evidence/77/3/photo.jpg',
        content_type: 'image/jpeg',
        file_size: 512,
        checksum: 'sha256:abc123',
        scan_status: 'passed',
        retention_policy: 'standard',
        retention_days: 180,
        retention_expires_at: '2026-06-30 00:00:00',
        cleanup_eligible: 1,
        refund_status: 'refunded',
        order_no: 'ORD14',
      }]];
    },
  });

  const result = await service.getRefundEvidenceRetentionCleanupDryRun({ page: '2', pageSize: '10' });

  assert.equal(result.list.length, 1);
  assert.deepEqual(result.pagination, { page: 2, pageSize: 10, total: 1, totalPages: 1 });
  assert.equal(result.list[0].proposedAction, 'retain-review');
  assert.equal(result.list[0].object_key, 'refund-evidence/77/3/photo.jpg');
  assert.equal(calls.some((call) => /UPDATE|DELETE/i.test(call[1])), false);
  assert.equal(calls.some((call) => call[1].includes('retention_expires_at <= NOW()')), true);
  assert.equal(calls.some((call) => call[1].includes('cleanup_eligible = 1')), true);
});

test('runRefundEvidenceRetentionCleanupDryRun records run and operation log without deleting evidence', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('COUNT(*) AS count')) return [[{ count: 2 }]];
      if (sql.includes('INSERT INTO retention_cleanup_runs')) return [{ insertId: 901 }];
      if (sql.includes('INSERT INTO operation_logs')) return [{ insertId: 902 }];
      return [[{ id: 501 }, { id: 502 }]];
    },
  });

  const result = await service.runRefundEvidenceRetentionCleanupDryRun({
    dryRun: true,
    limit: 50,
    operator: { userId: 9001, role: 'admin' },
  });

  assert.deepEqual(result, { runId: 901, dryRun: true, candidateCount: 2, deletedCount: 0, status: 'dry_run' });
  assert.equal(calls.some((call) => call[1].includes('INSERT INTO retention_cleanup_runs')), true);
  assert.equal(calls.some((call) => call[1].includes('INSERT INTO operation_logs')), true);
  assert.equal(calls.some((call) => /DELETE\s+FROM\s+refund_evidence/i.test(call[1])), false);
  assert.equal(calls.some((call) => /UPDATE\s+refund_evidence/i.test(call[1])), false);
});

test('getRefund returns refund detail with items and audit events for admin', async () => {
  const calls = [];
  const service = new OrderService({
    async query(sql, params) {
      calls.push(['query', sql, params]);
      if (sql.includes('FROM refund_requests rr')) return [[{
        id: 77,
        order_id: 14,
        order_no: 'ORD14',
        user_id: 3,
        refund_type: 'full',
        amount: '33.00',
        reason: 'bad item',
        status: 'requested',
        total_amount: '33.00',
        order_status: 'paid',
      }]];
      if (sql.includes('FROM order_items oi')) return [[{ product_id: 1, product_name: 'Keyboard', quantity: 1, price: '33.00', subtotal: '33.00', merchant_id: 5 }]];
      if (sql.includes('FROM refund_events')) return [[{ from_status: 'requested', to_status: 'approved', operator_id: 9001, note: 'ok' }]];
      if (sql.includes('FROM refund_evidence')) return [[{
        id: 501,
        evidence_type: 'image',
        url: '/uploads/refunds/photo.jpg',
        description: 'broken item',
        object_key: 'refund-evidence/77/3/photo.jpg',
        content_type: 'image/jpeg',
        file_size: 512,
        checksum: 'sha256:abc123',
        scan_status: 'passed',
        scan_result: 'clean',
        scanned_at: '2026-07-01 10:00:00',
        retention_policy: 'standard',
        retention_days: 180,
        retention_expires_at: '2026-12-28 10:00:00',
        cleanup_eligible: 0,
      }]];
      return [[]];
    },
  });

  const result = await service.getRefund({ userId: 9001, role: 'admin' }, 77);

  assert.equal(result.id, 77);
  assert.equal(result.items.length, 1);
  assert.equal(result.events.length, 1);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0].content_type, 'image/jpeg');
  assert.equal(result.evidence[0].file_size, 512);
  assert.equal(result.evidence[0].checksum, 'sha256:abc123');
  assert.equal(result.evidence[0].scan_status, 'passed');
  assert.equal(result.evidence[0].scan_result, 'clean');
  assert.equal(result.evidence[0].retention_policy, 'standard');
  assert.equal(result.evidence[0].retention_days, 180);
  assert.equal(result.evidence[0].cleanup_eligible, 0);
  assert.equal(calls.length, 4);
});

test('getRefund rejects merchant detail for another merchant order', async () => {
  const service = new OrderService({
    async query(sql) {
      if (sql.includes('FROM refund_requests rr')) return [[{ id: 77, order_id: 14, status: 'requested' }]];
      if (sql.includes('FROM order_items oi')) return [[{ product_id: 1, merchant_id: 6 }]];
      return [[]];
    },
  });

  await assert.rejects(
    () => service.getRefund({ userId: 9002, role: 'merchant', merchantId: 5 }, 77),
    /Refund request does not belong to merchant/
  );
});
