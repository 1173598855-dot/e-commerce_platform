const crypto = require('node:crypto');

const ALLOWED_SCAN_STATUSES = new Set(['pending', 'passed', 'failed', 'quarantined']);

function getHeader(headers = {}, name) {
  const direct = headers[name];
  if (direct !== undefined) return direct;
  const lower = name.toLowerCase();
  return Object.entries(headers).find(([key]) => key.toLowerCase() === lower)?.[1];
}

function canonicalBody(payload, rawBody) {
  if (Buffer.isBuffer(rawBody)) return rawBody.toString('utf8');
  if (typeof rawBody === 'string' && rawBody.length > 0) return rawBody;
  return JSON.stringify(payload || {});
}

function buildScannerSignature({ secret, timestamp, body }) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
}

function resolveTimestampToleranceSeconds() {
  const value = Number(process.env.REFUND_EVIDENCE_SCANNER_TIMESTAMP_TOLERANCE_SECONDS || 300);
  if (!Number.isFinite(value) || value <= 0) return 300;
  return value;
}

function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyRefundEvidenceScanCallback({ payload = {}, rawBody, headers = {}, nowMs = Date.now() }) {
  const secret = process.env.REFUND_EVIDENCE_SCANNER_SECRET;
  if (!secret) {
    throw Object.assign(new Error('REFUND_EVIDENCE_SCANNER_SECRET required'), { httpStatus: 500 });
  }

  const timestamp = String(getHeader(headers, 'x-scanner-timestamp') || '').trim();
  const signature = String(getHeader(headers, 'x-scanner-signature') || '').trim();
  const nonce = String(getHeader(headers, 'x-scanner-nonce') || payload.callbackId || payload.callback_id || payload.nonce || '').trim();
  if (!timestamp || !signature) {
    throw Object.assign(new Error('Scanner callback signature headers required'), { httpStatus: 401 });
  }
  if (!nonce) {
    throw Object.assign(new Error('Scanner callback nonce required'), { httpStatus: 401 });
  }
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    throw Object.assign(new Error('Invalid scanner callback timestamp'), { httpStatus: 401 });
  }
  const toleranceSeconds = resolveTimestampToleranceSeconds();
  const nowSeconds = Math.floor(Number(nowMs) / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) {
    throw Object.assign(new Error('Scanner callback timestamp outside tolerance'), { httpStatus: 401 });
  }

  const body = canonicalBody(payload, rawBody);
  const expected = buildScannerSignature({ secret, timestamp, body });
  if (!timingSafeEqualText(expected, signature)) {
    throw Object.assign(new Error('Invalid scanner callback signature'), { httpStatus: 401 });
  }

  const evidenceId = Number(payload.evidenceId || payload.evidence_id);
  const status = String(payload.status || payload.scanStatus || '').trim().toLowerCase();
  const result = String(payload.result || payload.scanResult || '').trim();
  const scannedAt = payload.scannedAt || payload.scanned_at || null;

  if (!Number.isInteger(evidenceId) || evidenceId <= 0) {
    throw Object.assign(new Error('evidenceId required'), { httpStatus: 400 });
  }
  if (!ALLOWED_SCAN_STATUSES.has(status)) {
    throw Object.assign(new Error(`Unsupported evidence scan status: ${status}`), { httpStatus: 400 });
  }

  return { evidenceId, status, result, scannedAt, idempotencyKey: nonce, rawPayload: payload };
}

module.exports = {
  buildScannerSignature,
  verifyRefundEvidenceScanCallback,
};
