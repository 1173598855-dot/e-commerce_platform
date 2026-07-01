const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const {
  buildScannerSignature,
  verifyRefundEvidenceScanCallback,
} = require('./refund-evidence-scan-callback');

test('verifyRefundEvidenceScanCallback accepts signed scanner payload', () => {
  const previousSecret = process.env.REFUND_EVIDENCE_SCANNER_SECRET;
  process.env.REFUND_EVIDENCE_SCANNER_SECRET = 'scanner-secret-for-tests';

  try {
    const payload = {
      evidenceId: 501,
      status: 'passed',
      result: 'clean',
      scannedAt: '2026-07-01T10:00:00.000Z',
    };
    const timestamp = '1782890400';
    const body = JSON.stringify(payload);
    const signature = buildScannerSignature({ secret: process.env.REFUND_EVIDENCE_SCANNER_SECRET, timestamp, body });

    const result = verifyRefundEvidenceScanCallback({
      payload,
      rawBody: body,
      headers: {
        'x-scanner-timestamp': timestamp,
        'x-scanner-signature': signature,
        'x-scanner-nonce': 'scan-callback-501-1',
      },
      nowMs: Number(timestamp) * 1000,
    });

    assert.deepEqual(result, {
      evidenceId: 501,
      status: 'passed',
      result: 'clean',
      scannedAt: '2026-07-01T10:00:00.000Z',
      idempotencyKey: 'scan-callback-501-1',
      rawPayload: payload,
    });
  } finally {
    if (previousSecret === undefined) delete process.env.REFUND_EVIDENCE_SCANNER_SECRET;
    else process.env.REFUND_EVIDENCE_SCANNER_SECRET = previousSecret;
  }
});

test('verifyRefundEvidenceScanCallback rejects bad scanner signatures', () => {
  const previousSecret = process.env.REFUND_EVIDENCE_SCANNER_SECRET;
  process.env.REFUND_EVIDENCE_SCANNER_SECRET = 'scanner-secret-for-tests';

  try {
    assert.throws(
      () => verifyRefundEvidenceScanCallback({
        payload: { evidenceId: 501, status: 'passed' },
        rawBody: JSON.stringify({ evidenceId: 501, status: 'passed' }),
        headers: {
          'x-scanner-timestamp': '1782890400',
          'x-scanner-signature': crypto.createHash('sha256').update('bad').digest('hex'),
          'x-scanner-nonce': 'scan-callback-501-bad-signature',
        },
        nowMs: 1782890400 * 1000,
      }),
      /Invalid scanner callback signature/
    );
  } finally {
    if (previousSecret === undefined) delete process.env.REFUND_EVIDENCE_SCANNER_SECRET;
    else process.env.REFUND_EVIDENCE_SCANNER_SECRET = previousSecret;
  }
});

test('verifyRefundEvidenceScanCallback rejects callbacks outside timestamp tolerance', () => {
  const previousSecret = process.env.REFUND_EVIDENCE_SCANNER_SECRET;
  const previousTolerance = process.env.REFUND_EVIDENCE_SCANNER_TIMESTAMP_TOLERANCE_SECONDS;
  process.env.REFUND_EVIDENCE_SCANNER_SECRET = 'scanner-secret-for-tests';
  process.env.REFUND_EVIDENCE_SCANNER_TIMESTAMP_TOLERANCE_SECONDS = '300';

  try {
    const payload = { evidenceId: 501, status: 'passed' };
    const body = JSON.stringify(payload);
    const timestamp = '1000';
    const signature = buildScannerSignature({ secret: process.env.REFUND_EVIDENCE_SCANNER_SECRET, timestamp, body });

    assert.throws(
      () => verifyRefundEvidenceScanCallback({
        payload,
        rawBody: body,
        headers: { 'x-scanner-timestamp': timestamp, 'x-scanner-signature': signature, 'x-scanner-nonce': 'scan-callback-501-old' },
        nowMs: 1_400_000,
      }),
      /Scanner callback timestamp outside tolerance/
    );
  } finally {
    if (previousSecret === undefined) delete process.env.REFUND_EVIDENCE_SCANNER_SECRET;
    else process.env.REFUND_EVIDENCE_SCANNER_SECRET = previousSecret;
    if (previousTolerance === undefined) delete process.env.REFUND_EVIDENCE_SCANNER_TIMESTAMP_TOLERANCE_SECONDS;
    else process.env.REFUND_EVIDENCE_SCANNER_TIMESTAMP_TOLERANCE_SECONDS = previousTolerance;
  }
});

test('verifyRefundEvidenceScanCallback rejects unsigned scanner callback when secret is missing', () => {
  const previousSecret = process.env.REFUND_EVIDENCE_SCANNER_SECRET;
  delete process.env.REFUND_EVIDENCE_SCANNER_SECRET;

  try {
    assert.throws(
      () => verifyRefundEvidenceScanCallback({
        payload: { evidenceId: 501, status: 'passed' },
        headers: { 'x-scanner-timestamp': '1782890400', 'x-scanner-signature': 'abc', 'x-scanner-nonce': 'scan-callback-501-missing-secret' },
      }),
      /REFUND_EVIDENCE_SCANNER_SECRET required/
    );
  } finally {
    if (previousSecret === undefined) delete process.env.REFUND_EVIDENCE_SCANNER_SECRET;
    else process.env.REFUND_EVIDENCE_SCANNER_SECRET = previousSecret;
  }
});

test('verifyRefundEvidenceScanCallback requires a nonce or callback id for idempotency', () => {
  const previousSecret = process.env.REFUND_EVIDENCE_SCANNER_SECRET;
  process.env.REFUND_EVIDENCE_SCANNER_SECRET = 'scanner-secret-for-tests';

  try {
    const payload = { evidenceId: 501, status: 'passed' };
    const body = JSON.stringify(payload);
    const timestamp = '1782890400';
    const signature = buildScannerSignature({ secret: process.env.REFUND_EVIDENCE_SCANNER_SECRET, timestamp, body });

    assert.throws(
      () => verifyRefundEvidenceScanCallback({
        payload,
        rawBody: body,
        headers: { 'x-scanner-timestamp': timestamp, 'x-scanner-signature': signature },
        nowMs: Number(timestamp) * 1000,
      }),
      /Scanner callback nonce required/
    );
  } finally {
    if (previousSecret === undefined) delete process.env.REFUND_EVIDENCE_SCANNER_SECRET;
    else process.env.REFUND_EVIDENCE_SCANNER_SECRET = previousSecret;
  }
});
