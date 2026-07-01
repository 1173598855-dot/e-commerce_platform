# Production Configuration Guide

Date: 2026-07-01
Project root: `C:\GitHub\E_commerce`

This guide explains what you are trying to achieve, what you need to provide, how to configure the project, how to verify each step, and what still requires provider accounts or additional development.

Do not paste real secrets into chat. Do not commit `.env.production.local`, keystores, certificates, private keys, access keys, or provider tokens.

## 1. Your Goal

Your practical goal is to move the project from local mock mode toward minimum gray-launch readiness.

Minimum gray launch means:

- Customers can register, log in, browse products, create orders, and submit after-sales requests.
- Admin and merchant users can review refunds, manage permissions, view operation logs, and use export placeholders.
- The backend can validate production-like environment configuration before deployment.
- Provider modes for payment, refund, evidence storage, scanner, logistics, and SMS are explicitly configured.
- You can run one command to check backend tests, launch configuration, and provider readiness.

This does not yet mean full production launch. Real payment SDKs, real refund SDKs, object-storage signing, scanner vendor dispatch, logistics provider callbacks, and Xiaomi app-store release still require accounts, credentials, devices, or additional implementation.

## 2. What You Need To Prepare

Prepare these values before final launch checks.

### Infrastructure

- API domain, for example `https://api.example.com`.
- HTTPS certificate or a deployment platform that provisions HTTPS.
- MySQL host, port, database name, username, and password.
- Redis host, port, and password.
- A 64+ character random `JWT_SECRET`.

### Payment And Refund

- WeChat Pay merchant account.
- `WECHAT_PAY_MCH_ID`.
- `WECHAT_PAY_APP_ID`.
- `WECHAT_PAY_API_V3_KEY`.
- `WECHAT_PAY_CERT_SERIAL_NO`.
- Merchant private key and certificate handling policy.
- Callback domain reachable from WeChat Pay.
- Refund business rules: manual approval required or not, partial refunds allowed or not.

### Evidence Storage

Choose one provider: OSS, COS, S3, or a compatible service.

- Bucket name.
- Region.
- Endpoint.
- Access key.
- Secret key.
- Public CDN or bucket base URL.
- Allowed MIME types.
- Maximum upload size.
- Evidence retention days.
- Deletion policy: disabled, dry-run, soft delete, archive, or hard delete.

### Scanner

- Scanner vendor or API endpoint.
- Authentication method, such as shared secret, token, or mTLS.
- Result schema.
- Quarantine policy.
- Callback URL allowed by the scanner vendor.

### Logistics

- Kuaidi100 or another logistics provider account.
- API key.
- Customer code.
- Secret if required by the selected product.
- Callback domain.
- Product decision: trace query only, subscription callbacks, electronic waybills, or all of them.

### SMS

Choose Aliyun or Tencent Cloud SMS.

- SMS provider.
- SMS sign name.
- SMS template code.
- Access key id.
- Access key secret.
- Tencent SMS app id if using Tencent.

### Android And Xiaomi Release

- Android release keystore.
- `frontend/android/keystore.properties` values.
- Privacy policy URL.
- User agreement URL.
- Xiaomi developer account.
- App listing materials.
- Real Xiaomi/Redmi test device or device-farm access.

## 3. Create The Production Env File

Run these commands in PowerShell:

```powershell
cd C:\GitHub\E_commerce
Copy-Item .env.example .env.production.local
notepad .env.production.local
```

Only edit `.env.production.local`. Do not edit `.env.example` with real values.

Verify that the production env file is not tracked:

```powershell
git status --short .env.production.local
```

Expected result: no tracked file entry. If Git shows it as staged or tracked, stop and remove it from git tracking before continuing.

## 4. Fill Server And Runtime Values

In `.env.production.local`, set:

```env
NODE_ENV=production
LOG_LEVEL=info

DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-mysql-user
DB_PASSWORD=your-strong-mysql-password
DB_NAME=ecommerce

REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-strong-redis-password

JWT_SECRET=your-random-secret-at-least-64-characters-long
```

Notes:

- `JWT_SECRET` must be at least 64 characters for the launch preflight.
- `DB_PASSWORD` and `REDIS_PASSWORD` must not use example placeholders such as `change-me`.
- If your local MySQL uses port `3314`, set `DB_PORT=3314` for local checks.

## 5. Fill Permission Enforcement Values

Before migration, keep this disabled if the table does not exist yet:

```env
PERMISSION_TOKEN_VERSION_ENFORCEMENT=0
```

After running `database/migrate_permission_versions.sql`, enable it:

```env
PERMISSION_TOKEN_VERSION_ENFORCEMENT=1
```

Rollback value:

```env
PERMISSION_TOKEN_VERSION_ENFORCEMENT=0
```

## 6. Fill WeChat Pay Values

Minimum launch preflight currently expects WeChat Pay:

```env
PAYMENT_PROVIDER=wechat
PAYMENT_CALLBACK_BASE_URL=https://your-api-domain.com/orders

WECHAT_PAY_MCH_ID=your-wechat-merchant-id
WECHAT_PAY_APP_ID=your-wechat-app-id
WECHAT_PAY_API_V3_KEY=your-wechat-api-v3-key
WECHAT_PAY_CERT_SERIAL_NO=your-wechat-cert-serial-no
```

Configure this callback URL in the WeChat Pay console:

```text
https://your-api-domain.com/orders/payment/callback/wechat
```

Important current limitation:

- The project has payment provider configuration validation and mock flow scaffolding.
- Real WeChat Pay SDK prepay, signature verification, callback decryption, and reconciliation still require implementation.
- After you fill the configuration, provider readiness may still report `not_implemented`. That means the config exists, but the real SDK work is not done yet.

## 7. Fill Refund Values And Decisions

Refunds currently use the same WeChat Pay merchant configuration.

Prepare this provider callback URL:

```text
https://your-api-domain.com/orders/refund/callback/wechat
```

You must also decide:

- Are partial refunds allowed?
- Must every refund be manually approved before provider submission?
- Who can approve merchant refunds?
- What should happen when provider refund submission succeeds but the callback is delayed?

Important current limitation:

- Local refund state machine, mock refund submission, mock callbacks, review flow, and idempotency records exist.
- Real WeChat Pay refund SDK submission and real refund callback verification/decryption still require implementation.

## 8. Fill Evidence Object Storage Values

Choose one provider: `oss`, `cos`, or `s3`.

Example for OSS-like configuration:

```env
REFUND_EVIDENCE_STORAGE_PROVIDER=oss
REFUND_EVIDENCE_STORAGE_BUCKET=your-bucket
REFUND_EVIDENCE_STORAGE_REGION=your-region
REFUND_EVIDENCE_STORAGE_ENDPOINT=https://oss-your-region.example.com
REFUND_EVIDENCE_STORAGE_ACCESS_KEY=your-access-key
REFUND_EVIDENCE_STORAGE_SECRET_KEY=your-secret-key
REFUND_EVIDENCE_PUBLIC_BASE_URL=https://cdn.example.com/refund-evidence

REFUND_EVIDENCE_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,video/mp4,application/pdf
REFUND_EVIDENCE_MAX_FILE_SIZE_BYTES=10485760
REFUND_EVIDENCE_UPLOAD_EXPIRES_SECONDS=600
REFUND_EVIDENCE_RETENTION_DAYS=180
```

Keep deletion disabled for gray launch unless legal/business policy approves deletion:

```env
RETENTION_CLEANUP_WORKER_ENABLED=false
RETENTION_CLEANUP_DRY_RUN=true
RETENTION_CLEANUP_BATCH_SIZE=50
RETENTION_CLEANUP_WORKER_INTERVAL_MS=3600000
```

Important current limitation:

- The app can request upload intent and store evidence metadata.
- Real object-storage upload signing still requires implementation for your selected provider.
- Real file picker is not connected yet; `docs/refund-evidence-file-picker-spike.md` describes that implementation path.

## 9. Fill Scanner Callback Values

Set a strong scanner callback secret:

```env
REFUND_EVIDENCE_SCANNER_SECRET=your-strong-random-scanner-callback-secret
REFUND_EVIDENCE_SCANNER_TIMESTAMP_TOLERANCE_SECONDS=300
```

Scanner callback URL:

```text
https://your-api-domain.com/orders/refunds/evidence/scan/callback
```

What already works locally:

- Scanner callback HMAC signature validation.
- Timestamp tolerance validation.
- Nonce/idempotency storage.
- Scan result update to `pending`, `passed`, `failed`, or `quarantined`.

What still requires your scanner provider:

- Upload-to-scan dispatch.
- Vendor result schema mapping.
- Quarantine rules.
- Retry and dead-letter policy.

## 10. Fill Logistics Values

Minimum recommended provider is Kuaidi100:

```env
LOGISTICS_PROVIDER=kuaidi100
LOGISTICS_CALLBACK_BASE_URL=https://your-api-domain.com/orders
KUAIDI100_KEY=your-kuaidi100-key
KUAIDI100_CUSTOMER=your-kuaidi100-customer
KUAIDI100_SECRET=your-kuaidi100-secret-if-required
```

You must decide whether first launch needs:

- Trace query only.
- Provider subscription callbacks.
- Electronic waybills.
- Abnormal package handling.
- Delivery completion callbacks.

Important current limitation:

- Local shipping and local tracking rows exist.
- Logistics provider skeleton validates Kuaidi100 configuration.
- Real Kuaidi100 API calls and callbacks still require implementation after the product contract is selected.

## 11. Fill SMS Values

For Aliyun SMS:

```env
SMS_PROVIDER=aliyun
SMS_SIGN_NAME=your-sms-sign-name
SMS_TEMPLATE_CODE=your-sms-template-code
SMS_ACCESS_KEY_ID=your-sms-access-key-id
SMS_ACCESS_KEY_SECRET=your-sms-access-key-secret
SMS_ENDPOINT=
SMS_APP_ID=
SMS_CODE_EXPIRE=300
SMS_COOLDOWN=60
SMS_IP_LIMIT=20
SMS_PHONE_LIMIT=10
SMS_CONSOLE_LOG_CODE=false
```

For Tencent SMS:

```env
SMS_PROVIDER=tencent
SMS_SIGN_NAME=your-sms-sign-name
SMS_TEMPLATE_CODE=your-template-id
SMS_ACCESS_KEY_ID=your-secret-id
SMS_ACCESS_KEY_SECRET=your-secret-key
SMS_APP_ID=your-sms-app-id
SMS_CODE_EXPIRE=300
SMS_COOLDOWN=60
SMS_IP_LIMIT=20
SMS_PHONE_LIMIT=10
SMS_CONSOLE_LOG_CODE=false
```

Important current limitation:

- Console SMS mode exists for local development.
- Real Aliyun/Tencent SMS SDK sending still requires implementation.

## 12. Run Database Migrations

From the project root:

```powershell
cd C:\GitHub\E_commerce
```

For a brand-new database, import the schema first:

```powershell
mysql -h your-db-host -P your-db-port -u your-db-user -p your-db-name < database/schema.sql
```

For an existing database, run migrations in this order:

```powershell
mysql -h your-db-host -P your-db-port -u your-db-user -p your-db-name < database/migrate_user_roles.sql
mysql -h your-db-host -P your-db-port -u your-db-user -p your-db-name < database/migrate_operations.sql
mysql -h your-db-host -P your-db-port -u your-db-user -p your-db-name < database/migrate_permission_versions.sql
mysql -h your-db-host -P your-db-port -u your-db-user -p your-db-name < database/migrate_refunds.sql
```

After `migrate_permission_versions.sql` succeeds, set:

```env
PERMISSION_TOKEN_VERSION_ENFORCEMENT=1
```

## 13. Run Configuration Checks

Run from backend microservices:

```powershell
cd C:\GitHub\E_commerce\backend\microservices
npm run preflight:launch
```

If it fails, fix the specific field it names. Common examples:

- `JWT_SECRET must be at least 64 characters`: make `JWT_SECRET` longer.
- `DB_PASSWORD must not use the example placeholder`: replace `change-me...` with a real password.
- `PAYMENT_PROVIDER must be wechat for minimum gray launch`: set `PAYMENT_PROVIDER=wechat`.
- `REFUND_EVIDENCE_STORAGE_PROVIDER must be oss, cos, or s3`: choose one real storage provider.
- `SMS_PROVIDER must be aliyun or tencent`: choose the SMS provider.

Then run provider readiness:

```powershell
npm run readiness:providers
```

Readiness status meanings:

- `ready`: this local readiness check passes.
- `missing_config`: you still need to fill config fields.
- `mock`: the provider is still set to mock/console mode.
- `disabled`: a required launch switch is off.
- `not_implemented`: config is present, but real provider SDK or adapter code is not implemented yet.

Run the combined checklist:

```powershell
npm run checklist:launch
```

This command runs:

1. Backend Node tests.
2. Minimum launch preflight.
3. Provider readiness.

It stops on the first failing step.

## 14. Configure Android Release Signing

Create the signing properties file:

```powershell
cd C:\GitHub\E_commerce\frontend\android
Copy-Item keystore.properties.example keystore.properties
notepad keystore.properties
```

Fill:

```properties
storeFile=path-to-your-release-keystore
storePassword=your-store-password
keyAlias=your-key-alias
keyPassword=your-key-password
```

Build release APK:

```powershell
cd C:\GitHub\E_commerce\frontend\android
.\gradlew assembleRelease
```

Before Xiaomi submission, prepare:

- Xiaomi developer account.
- Privacy policy URL.
- User agreement URL.
- Permissions disclosure.
- App screenshots and listing text.
- Test results from real Xiaomi/Redmi devices.

## 15. What You Should Do First

Recommended sequence:

1. Create `.env.production.local`.
2. Fill runtime, DB, Redis, and JWT values.
3. Run database migrations.
4. Set `PERMISSION_TOKEN_VERSION_ENFORCEMENT=1`.
5. Fill WeChat Pay, storage, scanner, logistics, and SMS config values.
6. Run `npm run preflight:launch` until there are no missing configuration issues.
7. Run `npm run readiness:providers` and list every `not_implemented` item.
8. Implement or request implementation for each `not_implemented` provider adapter.
9. Configure callback URLs in provider consoles.
10. Run sandbox or small-amount production verification.
11. Run `npm run checklist:launch`.
12. Build and install Android release on real test devices.
13. Submit to Xiaomi only after backend provider checks and device tests pass.

## 16. What You Should Ask For Next

After you fill `.env.production.local`, run:

```powershell
cd C:\GitHub\E_commerce\backend\microservices
npm run checklist:launch
```

Then provide only the non-secret output summary, especially statuses like `missing_config`, `mock`, `disabled`, or `not_implemented`. Do not paste secret values.

The next development work should be chosen from the failing readiness items, usually in this order:

1. WeChat Pay prepay and payment callback verification.
2. WeChat refund submission and refund callback verification.
3. Object-storage upload signing.
4. SMS provider SDK send.
5. Kuaidi100 trace query or callback persistence.
6. Scanner dispatch and quarantine policy.

## 17. Final Go/No-Go Rules

Do not treat the project as launch-ready until all of these are true:

- `.env.production.local` exists only locally and is not tracked.
- Database migrations succeeded.
- `PERMISSION_TOKEN_VERSION_ENFORCEMENT=1` is enabled after migration.
- `npm run preflight:launch` passes.
- `npm run readiness:providers` has no launch-critical `missing_config`, `mock`, `disabled`, or `not_implemented` statuses.
- Real payment callback is verified end to end.
- Real refund callback is verified end to end.
- Evidence upload signs and stores real files in the selected bucket.
- Scanner callback rejects bad signatures and accepts valid scanner results.
- Logistics provider trace or callback path is verified.
- `npm run test:node` passes.
- Frontend lint passes.
- Android release installs on at least one real Xiaomi/Redmi device.
- `nginx/ssl/server.key` is confirmed local-only or replaced/rotated if it was ever used outside local development.
