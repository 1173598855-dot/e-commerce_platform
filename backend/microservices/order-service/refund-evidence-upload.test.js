const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildRefundEvidenceUploadConfig,
  createRefundEvidenceUploadIntent,
  validateRefundEvidenceUploadRequest,
} = require('./refund-evidence-upload');

test('buildRefundEvidenceUploadConfig defaults to mock local upload settings', () => {
  const previous = {
    provider: process.env.REFUND_EVIDENCE_STORAGE_PROVIDER,
    baseUrl: process.env.REFUND_EVIDENCE_PUBLIC_BASE_URL,
  };
  delete process.env.REFUND_EVIDENCE_STORAGE_PROVIDER;
  delete process.env.REFUND_EVIDENCE_PUBLIC_BASE_URL;

  try {
    const config = buildRefundEvidenceUploadConfig();

    assert.equal(config.provider, 'mock');
    assert.equal(config.maxFileSizeBytes, 10 * 1024 * 1024);
    assert.equal(config.expiresInSeconds, 600);
    assert.ok(config.allowedMimeTypes.includes('image/jpeg'));
  } finally {
    if (previous.provider === undefined) delete process.env.REFUND_EVIDENCE_STORAGE_PROVIDER;
    else process.env.REFUND_EVIDENCE_STORAGE_PROVIDER = previous.provider;
    if (previous.baseUrl === undefined) delete process.env.REFUND_EVIDENCE_PUBLIC_BASE_URL;
    else process.env.REFUND_EVIDENCE_PUBLIC_BASE_URL = previous.baseUrl;
  }
});

test('validateRefundEvidenceUploadRequest rejects unsupported mime type and oversized files', () => {
  const config = buildRefundEvidenceUploadConfig({
    allowedMimeTypes: ['image/jpeg'],
    maxFileSizeBytes: 1024,
  });

  assert.throws(
    () => validateRefundEvidenceUploadRequest({ fileName: 'proof.exe', contentType: 'application/octet-stream', fileSize: 100 }, config),
    /Unsupported evidence content type: application\/octet-stream/
  );
  assert.throws(
    () => validateRefundEvidenceUploadRequest({ fileName: 'proof.jpg', contentType: 'image/jpeg', fileSize: 2048 }, config),
    /Evidence file size exceeds limit: 1024/
  );
});

test('createRefundEvidenceUploadIntent returns deterministic mock upload contract', () => {
  const config = buildRefundEvidenceUploadConfig({
    provider: 'mock',
    publicBaseUrl: 'https://cdn.example.com',
    expiresInSeconds: 300,
  });

  const intent = createRefundEvidenceUploadIntent({
    refundId: 77,
    userId: 3,
    fileName: 'proof.jpg',
    contentType: 'image/jpeg',
    fileSize: 512,
  }, config);

  assert.equal(intent.provider, 'mock');
  assert.equal(intent.method, 'PUT');
  assert.equal(intent.headers['content-type'], 'image/jpeg');
  assert.match(intent.objectKey, /^refund-evidence\/77\/3\/\d+-proof\.jpg$/);
  assert.equal(intent.publicUrl, `https://cdn.example.com/${intent.objectKey}`);
  assert.ok(intent.uploadUrl.includes(encodeURIComponent(intent.objectKey)));
  assert.equal(intent.expiresInSeconds, 300);
});

test('buildRefundEvidenceUploadConfig requires object storage credentials for production providers', () => {
  assert.throws(
    () => buildRefundEvidenceUploadConfig({ provider: 'oss', bucket: 'refunds' }),
    /REFUND_EVIDENCE_STORAGE_REGION required for oss storage/
  );
  assert.throws(
    () => buildRefundEvidenceUploadConfig({ provider: 's3', bucket: 'refunds', region: 'ap-east-1' }),
    /REFUND_EVIDENCE_STORAGE_ACCESS_KEY required for s3 storage/
  );
});
