# Operational API Examples

Last updated: 2026-07-01 Asia/Shanghai.

This document records runnable local examples for the current Phase 3 after-sales, payment callback, refund callback, evidence scan, and review flows. It is intentionally split between currently executable mock flows and production integrations that still require external accounts or policy decisions.

## Local Endpoint Assumptions

- Gateway base URL on the host machine: `http://localhost:4100/api`.
- Android emulator base URL from the React Native app: `http://10.0.2.2:4100/api`.
- Most customer/admin/merchant APIs require `Authorization: Bearer <access_token>`.
- Provider callbacks are public by design because payment, refund, and scanner servers call them directly.
- Unified response shape:

```json
{
  "code": 200,
  "data": {},
  "message": "ok",
  "requestId": "optional-request-id"
}
```

## Customer Refund Evidence Flow

### 1. Create A Refund Request

Currently executable for a paid, shipped, or completed order owned by the customer.

```bash
curl -X POST "http://localhost:4100/api/orders/refunds" \
  -H "Authorization: Bearer <customer_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 1001,
    "refundType": "full",
    "reason": "Goods damaged after delivery"
  }'
```

Expected data fields:

```json
{
  "refundId": 501,
  "orderId": 1001,
  "status": "requested",
  "duplicate": false
}
```

Duplicate full-refund requests for the same order return the existing refund request with `duplicate: true`.

### 2. Request Evidence Upload Intent

Currently executable in mock storage mode. Real OSS/COS/S3 signing is still not implemented.

```bash
curl -X POST "http://localhost:4100/api/orders/refunds/501/evidence/upload-intent" \
  -H "Authorization: Bearer <customer_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "refund-photo.jpg",
    "contentType": "image/jpeg",
    "fileSize": 245760
  }'
```

Supported local MIME types by default:

- `image/jpeg`
- `image/png`
- `image/webp`
- `video/mp4`
- `application/pdf`

Expected mock data fields:

```json
{
  "provider": "mock",
  "method": "PUT",
  "uploadUrl": "mock://refund-evidence/upload?key=refund-evidence%2F501%2F...",
  "objectKey": "refund-evidence/501/7/1780000000000-refund-photo.jpg",
  "publicUrl": "http://localhost:8080/uploads/refund-evidence/501/7/1780000000000-refund-photo.jpg",
  "headers": {
    "content-type": "image/jpeg"
  },
  "expiresInSeconds": 600
}
```

### 3. Attach Evidence Metadata

The current app uses mock file selection and attaches metadata after the mock upload-intent step.

```bash
curl -X POST "http://localhost:4100/api/orders/refunds/501/evidence" \
  -H "Authorization: Bearer <customer_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "image",
    "url": "http://localhost:8080/uploads/refund-evidence/501/7/refund-photo.jpg",
    "description": "Outer package and product are damaged",
    "objectKey": "refund-evidence/501/7/refund-photo.jpg",
    "contentType": "image/jpeg",
    "fileSize": 245760,
    "checksum": "sha256:local-demo-checksum"
  }'
```

Allowed evidence `type` values are `image`, `video`, and `document`. Newly attached evidence starts with `scan_status = pending` and cannot be used for normal approval until the scan status becomes `passed`.

## Merchant And Admin Refund Review

### 1. List Refunds

Requires `admin` or `merchant` role plus `refund:list` permission. Merchant users are scoped to their bound merchant id.

```bash
curl "http://localhost:4100/api/orders/refunds?status=requested&page=1&pageSize=20" \
  -H "Authorization: Bearer <admin_or_merchant_access_token>"
```

Expected data shape:

```json
{
  "list": [
    {
      "id": 501,
      "order_id": 1001,
      "order_no": "ORD1001",
      "refund_type": "full",
      "amount": "199.00",
      "reason": "Goods damaged after delivery",
      "status": "requested",
      "order_status": "paid"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 2. Get Refund Detail

Requires `admin` or `merchant` role plus `refund:detail` permission.

```bash
curl "http://localhost:4100/api/orders/refunds/501" \
  -H "Authorization: Bearer <admin_or_merchant_access_token>"
```

The detail response includes order snapshot fields, order items, refund event timeline, and evidence metadata including scan and retention fields:

```json
{
  "id": 501,
  "order_id": 1001,
  "status": "requested",
  "items": [],
  "events": [],
  "evidence": [
    {
      "id": 9001,
      "evidence_type": "image",
      "url": "http://localhost:8080/uploads/refund-evidence/501/7/refund-photo.jpg",
      "object_key": "refund-evidence/501/7/refund-photo.jpg",
      "content_type": "image/jpeg",
      "file_size": 245760,
      "checksum": "sha256:local-demo-checksum",
      "scan_status": "pending",
      "scan_result": "",
      "retention_policy": "refund-evidence-default",
      "retention_days": 180,
      "retention_expires_at": "2026-12-28T00:00:00.000Z",
      "cleanup_eligible": 0
    }
  ]
}
```

### 3. Write Admin Scan Result Manually

Currently executable for admins. This is useful for local testing before a real scanner vendor is connected.

```bash
curl -X PUT "http://localhost:4100/api/orders/refunds/evidence/9001/scan" \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "passed",
    "result": "Local manual scan passed"
  }'
```

Allowed scan statuses are `pending`, `passed`, `failed`, and `quarantined`.

### 4. Review Refund

Requires `admin` or `merchant` role plus `refund:review` permission.

```bash
curl -X PUT "http://localhost:4100/api/orders/refunds/501/review" \
  -H "Authorization: Bearer <admin_or_merchant_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "note": "Evidence scan passed, refund approved"
  }'
```

Refund approval is blocked when evidence exists and any evidence item is not `passed`.

Admin-only manual risk bypass is available for exceptional local or operational cases. It requires a non-empty note and writes a dedicated review audit log.

```bash
curl -X PUT "http://localhost:4100/api/orders/refunds/501/review" \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "note": "Manual risk accepted after offline compliance review",
    "evidenceScanBypass": true
  }'
```

## Scanner Callback Signature

Currently executable when `REFUND_EVIDENCE_SCANNER_SECRET` is configured. The scanner callback endpoint is public but signed.

Endpoint:

```text
POST http://localhost:4100/api/orders/refunds/evidence/scan/callback
```

Required headers:

- `x-scanner-timestamp`: Unix timestamp in seconds.
- `x-scanner-signature`: lowercase hex HMAC-SHA256 signature.
- `x-scanner-nonce`: unique idempotency value for retries. The payload may alternatively include `callbackId`, `callback_id`, or `nonce`.

Signature algorithm:

```text
signature = HMAC_SHA256_HEX(REFUND_EVIDENCE_SCANNER_SECRET, timestamp + "." + raw_request_body)
```

Example body:

```json
{"callbackId":"scan-cb-9001-001","evidenceId":9001,"status":"passed","result":"clean","scannedAt":"2026-07-01T01:00:00.000Z"}
```

Node.js signing example:

```js
const crypto = require('node:crypto');

const secret = process.env.REFUND_EVIDENCE_SCANNER_SECRET;
const timestamp = Math.floor(Date.now() / 1000).toString();
const body = JSON.stringify({
  callbackId: 'scan-cb-9001-001',
  evidenceId: 9001,
  status: 'passed',
  result: 'clean',
  scannedAt: '2026-07-01T01:00:00.000Z',
});
const signature = crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${body}`)
  .digest('hex');

console.log({ timestamp, signature, body });
```

Callback curl template:

```bash
curl -X POST "http://localhost:4100/api/orders/refunds/evidence/scan/callback" \
  -H "Content-Type: application/json" \
  -H "x-scanner-timestamp: <timestamp>" \
  -H "x-scanner-signature: <signature>" \
  -H "x-scanner-nonce: scan-cb-9001-001" \
  -d '{"callbackId":"scan-cb-9001-001","evidenceId":9001,"status":"passed","result":"clean","scannedAt":"2026-07-01T01:00:00.000Z"}'
```

Duplicate callbacks with the same nonce are stored as duplicates and do not update evidence repeatedly.

## Mock Payment Callback

Currently executable for local route and idempotency testing. Real WeChat Pay/Alipay callback signature verification and decryption are still not implemented.

```bash
curl -X POST "http://localhost:4100/api/orders/payment/callback/mock" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNo": "ORD1001",
    "transactionId": "mock-txn-1001",
    "paidAmount": "199.00"
  }'
```

Mock callback idempotency key format:

```text
payment-callback:mock:<transactionId-or-orderNo>
```

Provider aliases `wechatpay` and `wxpay` normalize to `wechat`, but real provider verification still returns a clear not-implemented error after required configuration validation.

## Mock Refund Callback

Currently executable for local route and idempotency testing after a refund enters `refunding` state. Real provider refund callback verification and decryption are still not implemented.

```bash
curl -X POST "http://localhost:4100/api/orders/refund/callback/mock" \
  -H "Content-Type: application/json" \
  -d '{
    "refundId": 501,
    "providerRefundId": "mock-refund-501",
    "status": "success"
  }'
```

Supported success status aliases include `success`, `succeeded`, `refunded`, and `refund_success`. Supported failure aliases include `fail`, `failed`, `closed`, and `refund_failed`.

Mock callback idempotency key format:

```text
refund-callback:mock:<providerRefundId-or-refundId>
```

## Retention Cleanup Draft

A read-only cleanup dry-run endpoint is available for admins. No cleanup worker or deletion endpoint is enabled yet. Current evidence rows store retention metadata:

- `retention_policy`
- `retention_days`
- `retention_expires_at`
- `cleanup_eligible`

Dry-run endpoint:

```bash
curl "http://localhost:4100/api/orders/refunds/evidence/retention/cleanup-dry-run?page=1&pageSize=20" \
  -H "Authorization: Bearer <admin_access_token>"
```

The endpoint requires `admin` role plus `refund:review` permission and only returns rows where `cleanup_eligible = 1` and `retention_expires_at <= NOW()`.

Expected data shape:

```json
{
  "list": [
    {
      "id": 9001,
      "refund_id": 501,
      "object_key": "refund-evidence/501/7/refund-photo.jpg",
      "retention_policy": "standard",
      "retention_days": 180,
      "retention_expires_at": "2026-06-30T00:00:00.000Z",
      "cleanup_eligible": 1,
      "refund_status": "refunded",
      "order_no": "ORD1001",
      "proposedAction": "retain-review"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Dry-run behavior before deletion is enabled:

1. Select evidence where `retention_expires_at <= NOW()` and cleanup policy marks it eligible.
2. Produce a report with evidence id, refund id, object key, URL, retention policy, expiry time, and proposed cleanup action.
3. Keep `proposedAction` at `retain-review` until legal/business retention policy is approved.
4. Write audit logs before any future soft-delete, archive, quarantine, or hard-delete action is allowed.

Cleanup execution remains a P1 gap until final retention policy is provided.

## Still Requiring External Resources

- Real WeChat Pay/Alipay payment and refund credentials, certificates, callback domains, and sandbox verification.
- Real OSS/COS/S3 bucket credentials and CDN/public URL policy.
- Scanner vendor endpoint, authentication material, result schema, retry/dead-letter behavior, and quarantine rules.
- Logistics provider account, tracking API, and callback contract.
- Android release keystore, Xiaomi developer account, privacy URL, permission disclosure, and real Xiaomi/Redmi device testing.
