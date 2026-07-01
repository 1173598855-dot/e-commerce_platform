const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-64-characters-for-order-controller-test';

const controller = require('./order.controller');
const { orderService } = require('../services/order.service');
const { buildScannerSignature } = require('../refund-evidence-scan-callback');

function createResponse() {
  return {
    statusCode: null,
    body: null,
    req: { headers: {} },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    getHeader() { return undefined; },
  };
}

test('reviewRefund passes operator role and merchant scope to service', async () => {
  const original = orderService.reviewRefund;
  const calls = [];
  orderService.reviewRefund = async (...args) => {
    calls.push(args);
    return { refundId: 77, status: 'approved' };
  };

  try {
    const req = {
      user: { userId: 9001, role: 'merchant', merchantId: 5 },
      params: { id: '77' },
      body: { status: 'approved', note: 'ok' },
    };
    const res = createResponse();

    await controller.reviewRefund(req, res);

    assert.deepEqual(calls, [[{ userId: 9001, role: 'merchant', merchantId: 5 }, '77', { status: 'approved', note: 'ok' }]]);
    assert.equal(res.statusCode, 200);
  } finally {
    orderService.reviewRefund = original;
  }
});

test('ship passes operator role and merchant scope to service', async () => {
  const original = orderService.shipOrder;
  const calls = [];
  orderService.shipOrder = async (...args) => {
    calls.push(args);
    return { orderId: 88, status: 'shipped' };
  };

  try {
    const req = {
      user: { userId: 9001, role: 'merchant', merchantId: 5 },
      params: { id: '88' },
      body: { trackingCompany: 'SF', trackingNumber: 'SF123456' },
    };
    const res = createResponse();

    await controller.ship(req, res);

    assert.deepEqual(calls, [[
      { userId: 9001, role: 'merchant', merchantId: 5 },
      '88',
      { trackingCompany: 'SF', trackingNumber: 'SF123456' },
    ]]);
    assert.equal(res.statusCode, 200);
  } finally {
    orderService.shipOrder = original;
  }
});

test('refundList passes operator role, merchant scope and query to service', async () => {
  const original = orderService.listRefunds;
  const calls = [];
  orderService.listRefunds = async (...args) => {
    calls.push(args);
    return { list: [], pagination: { page: 2, pageSize: 20, total: 0 } };
  };

  try {
    const req = {
      user: { userId: 9002, role: 'merchant', merchantId: 5 },
      query: { status: 'requested', page: '2', pageSize: '20' },
    };
    const res = createResponse();

    await controller.refundList(req, res);

    assert.deepEqual(calls, [[{ userId: 9002, role: 'merchant', merchantId: 5 }, { status: 'requested', page: '2', pageSize: '20' }]]);
    assert.equal(res.statusCode, 200);
  } finally {
    orderService.listRefunds = original;
  }
});

test('refundDetail passes operator role and merchant scope to service', async () => {
  const original = orderService.getRefund;
  const calls = [];
  orderService.getRefund = async (...args) => {
    calls.push(args);
    return { id: 77, events: [] };
  };

  try {
    const req = {
      user: { userId: 9002, role: 'merchant', merchantId: 5 },
      params: { id: '77' },
    };
    const res = createResponse();

    await controller.refundDetail(req, res);

    assert.deepEqual(calls, [[{ userId: 9002, role: 'merchant', merchantId: 5 }, '77']]);
    assert.equal(res.statusCode, 200);
  } finally {
    orderService.getRefund = original;
  }
});

test('addRefundEvidence passes user id, refund id and evidence payload to service', async () => {
  const original = orderService.addRefundEvidence;
  const calls = [];
  orderService.addRefundEvidence = async (...args) => {
    calls.push(args);
    return { evidenceId: 501, refundId: 77 };
  };

  try {
    const req = {
      user: { userId: 3, role: 'customer' },
      params: { id: '77' },
      body: { url: '/uploads/refunds/photo.jpg', type: 'image', description: 'broken item' },
    };
    const res = createResponse();

    await controller.addRefundEvidence(req, res);

    assert.deepEqual(calls, [[3, '77', { url: '/uploads/refunds/photo.jpg', type: 'image', description: 'broken item' }]]);
    assert.equal(res.statusCode, 200);
  } finally {
    orderService.addRefundEvidence = original;
  }
});

test('createRefundEvidenceUploadIntent passes user id, refund id and file metadata to service', async () => {
  const original = orderService.createRefundEvidenceUploadIntent;
  const calls = [];
  orderService.createRefundEvidenceUploadIntent = async (...args) => {
    calls.push(args);
    return { provider: 'mock', uploadUrl: 'mock://upload', publicUrl: 'https://cdn.example.com/refund-evidence/77/3/proof.jpg' };
  };

  try {
    const req = {
      user: { userId: 3, role: 'customer' },
      params: { id: '77' },
      body: { fileName: 'proof.jpg', contentType: 'image/jpeg', fileSize: 512 },
    };
    const res = createResponse();

    await controller.createRefundEvidenceUploadIntent(req, res);

    assert.deepEqual(calls, [[3, '77', { fileName: 'proof.jpg', contentType: 'image/jpeg', fileSize: 512 }]]);
    assert.equal(res.statusCode, 200);
  } finally {
    orderService.createRefundEvidenceUploadIntent = original;
  }
});

test('updateRefundEvidenceScan passes operator, evidence id and scan payload to service', async () => {
  const original = orderService.updateRefundEvidenceScan;
  const calls = [];
  orderService.updateRefundEvidenceScan = async (...args) => {
    calls.push(args);
    return { evidenceId: 501, scanStatus: 'passed' };
  };

  try {
    const req = {
      user: { userId: 9001, role: 'admin' },
      params: { evidenceId: '501' },
      body: { status: 'passed', result: 'clean' },
    };
    const res = createResponse();

    await controller.updateRefundEvidenceScan(req, res);

    assert.deepEqual(calls, [[{ userId: 9001, role: 'admin' }, '501', { status: 'passed', result: 'clean' }]]);
    assert.equal(res.statusCode, 200);
  } finally {
    orderService.updateRefundEvidenceScan = original;
  }
});

test('refundEvidenceScanCallback verifies signed payload and updates evidence scan', async () => {
  const original = orderService.updateRefundEvidenceScan;
  const previousSecret = process.env.REFUND_EVIDENCE_SCANNER_SECRET;
  const calls = [];
  orderService.updateRefundEvidenceScan = async (...args) => {
    calls.push(args);
    return { evidenceId: 501, scanStatus: 'passed' };
  };

  try {
    process.env.REFUND_EVIDENCE_SCANNER_SECRET = 'scanner-secret-for-controller-test';
    const rawBody = '{"evidenceId":501,"status":"passed","result":"clean"}';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = buildScannerSignature({
      secret: process.env.REFUND_EVIDENCE_SCANNER_SECRET,
      timestamp,
      body: rawBody,
    });
    const req = {
      headers: { 'x-scanner-timestamp': timestamp, 'x-scanner-signature': signature, 'x-scanner-nonce': 'scan-callback-501-controller' },
      body: { evidenceId: 501, status: 'passed', result: 'clean' },
      rawBody,
    };
    const res = createResponse();

    await controller.refundEvidenceScanCallback(req, res);

    assert.deepEqual(calls, [[
      { userId: 'scanner', role: 'system' },
      501,
      {
        status: 'passed',
        result: 'clean',
        scannedAt: null,
        idempotencyKey: 'scan-callback-501-controller',
        rawPayload: { evidenceId: 501, status: 'passed', result: 'clean' },
      },
    ]]);
    assert.equal(res.statusCode, 200);
  } finally {
    if (typeof previousSecret !== 'undefined') process.env.REFUND_EVIDENCE_SCANNER_SECRET = previousSecret;
    else delete process.env.REFUND_EVIDENCE_SCANNER_SECRET;
    orderService.updateRefundEvidenceScan = original;
  }
});
