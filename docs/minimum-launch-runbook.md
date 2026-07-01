# Minimum Launch Runbook

This runbook tracks the smallest gray-launch path for the active project lines: `frontend/` and `backend/microservices/`. Do not put real secrets in this document or commit them to git.

For a step-by-step operator guide that explains the goal, required values, exact configuration steps, verification commands, and implementation blockers, see `docs/production-configuration-guide.md`.

## Launch Scope

Minimum gray launch means:

- Real users can register, log in, browse products, create orders, and submit after-sales requests.
- Payment, refund, object storage, SMS, and logistics provider modes are configured through environment variables.
- Operations can review refunds, manage permissions, view operation logs, and create export placeholders.
- Permission token version enforcement can be enabled after `permission_versions` migration is applied.

The launch does not include finance-grade reconciliation, multi-provider routing, real export file generation, automatic evidence deletion, or Xiaomi app-store approval automation.

## Provide These Values

Create `.env.production.local` from `.env.example` and fill these values locally. Keep the file out of git.

### Server And Runtime

- `NODE_ENV=production`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `JWT_SECRET`, at least 64 random characters
- Public API domain, for example `https://api.example.com`
- Valid HTTPS certificate or a deployment plan that provisions one

### Permission Enforcement

- `PERMISSION_TOKEN_VERSION_ENFORCEMENT=1` after running `database/migrate_permission_versions.sql`
- Rollback value: `PERMISSION_TOKEN_VERSION_ENFORCEMENT=0`

### WeChat Pay

- `PAYMENT_PROVIDER=wechat`
- `PAYMENT_CALLBACK_BASE_URL=https://api.example.com/orders`
- `WECHAT_PAY_MCH_ID`
- `WECHAT_PAY_APP_ID`
- `WECHAT_PAY_API_V3_KEY`
- `WECHAT_PAY_CERT_SERIAL_NO`
- Merchant private key and platform certificate storage path or secret-manager reference, once the SDK implementation is added
- Provider callback URL to configure in WeChat Pay: `https://api.example.com/orders/payment/callback/wechat`

### Refunds

- Confirm whether refunds require manual approval before provider submission
- Confirm whether partial refunds are allowed
- Use the same WeChat Pay merchant credentials unless finance requires a separate merchant account
- Provider refund callback URL: `https://api.example.com/orders/refund/callback/wechat`

### Evidence Object Storage

Choose one provider: `oss`, `cos`, or `s3`.

- `REFUND_EVIDENCE_STORAGE_PROVIDER`
- `REFUND_EVIDENCE_STORAGE_BUCKET`
- `REFUND_EVIDENCE_STORAGE_REGION`
- `REFUND_EVIDENCE_STORAGE_ENDPOINT`
- `REFUND_EVIDENCE_STORAGE_ACCESS_KEY`
- `REFUND_EVIDENCE_STORAGE_SECRET_KEY`
- `REFUND_EVIDENCE_PUBLIC_BASE_URL`
- `REFUND_EVIDENCE_ALLOWED_MIME_TYPES`
- `REFUND_EVIDENCE_MAX_FILE_SIZE_BYTES`
- `REFUND_EVIDENCE_UPLOAD_EXPIRES_SECONDS`
- Retention decision for `REFUND_EVIDENCE_RETENTION_DAYS`
- `RETENTION_CLEANUP_WORKER_ENABLED=false` until a retention deletion policy is approved
- `RETENTION_CLEANUP_DRY_RUN=true` for local and gray launch checks
- `RETENTION_CLEANUP_BATCH_SIZE=50` or an owner-approved batch size
- `RETENTION_CLEANUP_WORKER_INTERVAL_MS=3600000` or an owner-approved interval

### Scanner Callback

- `REFUND_EVIDENCE_SCANNER_SECRET`
- `REFUND_EVIDENCE_SCANNER_TIMESTAMP_TOLERANCE_SECONDS`
- Scanner callback URL: `https://api.example.com/orders/refunds/evidence/scan/callback`
- Scanner vendor result schema before real dispatch is implemented

### Logistics

Minimum recommended provider: Kuaidi100.

- `LOGISTICS_PROVIDER=kuaidi100`
- `LOGISTICS_CALLBACK_BASE_URL=https://api.example.com/orders`
- `KUAIDI100_KEY`
- `KUAIDI100_CUSTOMER`
- `KUAIDI100_SECRET`, if required by the selected Kuaidi100 product
- Confirm whether the first launch only queries traces or also creates electronic waybills

### SMS

- `SMS_PROVIDER=aliyun` or `tencent`
- `SMS_SIGN_NAME`
- `SMS_TEMPLATE_CODE`
- `SMS_ACCESS_KEY_ID`
- `SMS_ACCESS_KEY_SECRET`
- Provider endpoint/app id if required

### Android Release

- `frontend/android/keystore.properties`, not committed to git
- Release keystore file
- `storePassword`, `keyAlias`, `keyPassword`
- Privacy policy URL
- User agreement URL
- Xiaomi developer account and listing materials
- Real Xiaomi/Redmi test device or device farm access

## Implementation Steps After Values Are Available

1. Fill `.env.production.local` locally and verify it is ignored by git.
2. Run database migrations in order, including `database/migrate_user_roles.sql`, `database/migrate_operations.sql`, and `database/migrate_permission_versions.sql`.
3. Switch `PERMISSION_TOKEN_VERSION_ENFORCEMENT=1` only after migration succeeds.
4. Implement and verify the selected real provider adapter in this order: WeChat Pay prepay, WeChat Pay payment callback verification, WeChat refund submission, WeChat refund callback verification.
5. Implement object-storage upload signing for the selected provider.
6. Implement Kuaidi100 trace query or callback persistence based on the selected product contract.
7. Configure provider callback URLs in the provider consoles.
8. Run sandbox or small-amount production verification before gray launch.
9. Build Android release only after backend provider checks pass.

## Verification Commands

Run from the repository root unless noted.

```powershell
cd backend/microservices
npm run checklist:launch
cd ../..

npm run test:node
node --test backend/microservices/auth-service/services/auth.service.test.js backend/microservices/tests/minimum-launch-config.test.js
node --check backend/microservices/auth-service/services/auth.service.js
npm run lint --prefix frontend
```

For deployment configuration:

```powershell
docker compose config
docker compose build auth-service order-service gateway
```

For Android after signing files are present:

```powershell
cd frontend/android
./gradlew assembleRelease
```

## Go/No-Go Checklist

- `.env.production.local` exists locally and is not tracked by git.
- `npm run checklist:launch` passes from `backend/microservices`; it runs backend Node tests, minimum launch preflight, and provider readiness in sequence.
- Provider readiness JSON has no `missing_config`, `mock`, `disabled`, or `not_implemented` blockers for launch-critical providers.
- `PERMISSION_TOKEN_VERSION_ENFORCEMENT=1` rejects stale auth-service verify/refresh tokens in tests.
- WeChat Pay sandbox or small-amount payment callback is verified end to end.
- WeChat refund callback is verified end to end.
- Evidence upload signs and stores files in the selected bucket.
- Retention cleanup worker remains disabled or dry-run only until legal/business policy approves deletion behavior.
- Scanner callback secret is configured and rejects bad signatures.
- Logistics provider config validates and at least one trace query/callback is verified.
- Frontend lint passes.
- Backend Node tests pass.
- Android release APK installs on at least one Xiaomi/Redmi device.
- `nginx/ssl/server.key` provenance is confirmed as local-only or rotated.

## Current Blockers

- Real WeChat Pay SDK/certificate implementation still needs merchant credentials and certificate handling policy.
- Real object-storage signing still needs provider choice and credentials.
- Real scanner dispatch still needs vendor contract.
- Real logistics integration still needs Kuaidi100 product contract and callback rules.
- Xiaomi app-store submission still needs account, release signing, privacy materials, and device validation.
