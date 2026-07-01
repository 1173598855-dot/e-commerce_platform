const crypto = require('node:crypto');
const path = require('node:path');

const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'application/pdf',
];

function parseCsv(value, fallback) {
  if (!value) return fallback;
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function requireConfig(config, key, envName, provider) {
  if (!config[key]) {
    throw Object.assign(new Error(`${envName} required for ${provider} storage`), { httpStatus: 500 });
  }
}

function buildRefundEvidenceUploadConfig(overrides = {}) {
  const provider = String(overrides.provider || process.env.REFUND_EVIDENCE_STORAGE_PROVIDER || 'mock').trim().toLowerCase();
  const config = {
    provider,
    bucket: overrides.bucket || process.env.REFUND_EVIDENCE_STORAGE_BUCKET || '',
    region: overrides.region || process.env.REFUND_EVIDENCE_STORAGE_REGION || '',
    endpoint: overrides.endpoint || process.env.REFUND_EVIDENCE_STORAGE_ENDPOINT || '',
    accessKey: overrides.accessKey || process.env.REFUND_EVIDENCE_STORAGE_ACCESS_KEY || '',
    secretKey: overrides.secretKey || process.env.REFUND_EVIDENCE_STORAGE_SECRET_KEY || '',
    publicBaseUrl: (overrides.publicBaseUrl || process.env.REFUND_EVIDENCE_PUBLIC_BASE_URL || 'http://localhost:8080/uploads').replace(/\/+$/, ''),
    allowedMimeTypes: overrides.allowedMimeTypes || parseCsv(process.env.REFUND_EVIDENCE_ALLOWED_MIME_TYPES, DEFAULT_ALLOWED_MIME_TYPES),
    maxFileSizeBytes: parsePositiveInt(overrides.maxFileSizeBytes || process.env.REFUND_EVIDENCE_MAX_FILE_SIZE_BYTES, 10 * 1024 * 1024),
    expiresInSeconds: parsePositiveInt(overrides.expiresInSeconds || process.env.REFUND_EVIDENCE_UPLOAD_EXPIRES_SECONDS, 600),
  };

  if (!['mock', 'oss', 'cos', 's3'].includes(provider)) {
    throw Object.assign(new Error(`Unsupported refund evidence storage provider: ${provider}`), { httpStatus: 500 });
  }

  if (provider !== 'mock') {
    requireConfig(config, 'bucket', 'REFUND_EVIDENCE_STORAGE_BUCKET', provider);
    requireConfig(config, 'region', 'REFUND_EVIDENCE_STORAGE_REGION', provider);
    requireConfig(config, 'accessKey', 'REFUND_EVIDENCE_STORAGE_ACCESS_KEY', provider);
    requireConfig(config, 'secretKey', 'REFUND_EVIDENCE_STORAGE_SECRET_KEY', provider);
  }

  return config;
}

function sanitizeFileName(fileName) {
  const baseName = path.basename(String(fileName || 'evidence').trim()).replace(/[^a-zA-Z0-9._-]/g, '-');
  return baseName || 'evidence';
}

function validateRefundEvidenceUploadRequest(body, config = buildRefundEvidenceUploadConfig()) {
  const fileName = sanitizeFileName(body?.fileName || body?.filename);
  const contentType = String(body?.contentType || body?.mimeType || '').trim().toLowerCase();
  const fileSize = Number(body?.fileSize || body?.size || 0);

  if (!contentType) throw Object.assign(new Error('contentType required'), { httpStatus: 400 });
  if (!Number.isFinite(fileSize) || fileSize <= 0) throw Object.assign(new Error('fileSize required'), { httpStatus: 400 });
  if (!config.allowedMimeTypes.includes(contentType)) {
    throw Object.assign(new Error(`Unsupported evidence content type: ${contentType}`), { httpStatus: 400 });
  }
  if (fileSize > config.maxFileSizeBytes) {
    throw Object.assign(new Error(`Evidence file size exceeds limit: ${config.maxFileSizeBytes}`), { httpStatus: 400 });
  }

  return { fileName, contentType, fileSize };
}

function buildObjectKey({ refundId, userId, fileName }) {
  return `refund-evidence/${refundId}/${userId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

function createMockUploadIntent({ objectKey, contentType }, config) {
  const signature = crypto
    .createHmac('sha256', config.secretKey || 'local-refund-evidence-secret')
    .update(`${objectKey}:${contentType}:${config.expiresInSeconds}`)
    .digest('hex');

  return {
    provider: 'mock',
    method: 'PUT',
    uploadUrl: `mock://refund-evidence/upload?key=${encodeURIComponent(objectKey)}&signature=${signature}`,
    objectKey,
    publicUrl: `${config.publicBaseUrl}/${objectKey}`,
    headers: { 'content-type': contentType },
    expiresInSeconds: config.expiresInSeconds,
  };
}

function createRefundEvidenceUploadIntent(body, config = buildRefundEvidenceUploadConfig()) {
  const metadata = validateRefundEvidenceUploadRequest(body, config);
  const objectKey = buildObjectKey({ refundId: body.refundId, userId: body.userId, fileName: metadata.fileName });

  if (config.provider === 'mock') {
    return createMockUploadIntent({ objectKey, contentType: metadata.contentType }, config);
  }

  throw Object.assign(new Error(`Refund evidence ${config.provider} upload signing is not implemented`), { httpStatus: 501 });
}

module.exports = {
  buildRefundEvidenceUploadConfig,
  createRefundEvidenceUploadIntent,
  validateRefundEvidenceUploadRequest,
};
