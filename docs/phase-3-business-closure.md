# Phase 3 Business Closure

This phase starts after runtime security and provider integration foundations are in place. It focuses on making the e-commerce business flow production-ready.

## Completed Changes

- Payment creation now goes through a provider abstraction instead of being hardcoded directly in `mockPayment`.
- `PAYMENT_PROVIDER=mock` remains the default for local/staging without real merchant credentials.
- WeChat Pay and Alipay configuration placeholders are documented in `.env.example` and wired into `order-service` in Docker Compose.
- WeChat Pay and Alipay provider modes validate required merchant configuration and fail clearly until SDK integration is implemented.
- Payment provider tests cover mock mode, required WeChat Pay credentials, and clear failure for real provider stubs.
- Payment callback entrypoint now exists at `POST /payment/callback/:provider` and is intentionally public for provider servers.
- Payment callback provider normalization and idempotency key generation are covered by tests.
- Mock payment callback verification is available for local route and idempotency checks.
- Verified payment callbacks now run through a DB transaction that records an idempotency key before updating the order.
- Duplicate payment callbacks increment `duplicate_count` and do not update the order a second time.
- New databases get `payment_callback_records` from `schema.sql`; existing databases can run `database/migrate_payment_callbacks.sql`.
- Pending order timeout compensation now has a reusable service method that cancels expired pending orders and restores product stock in one transaction.
- Duplicate/late timeout scans are protected by conditional `status = 'pending'` updates before stock restoration.
- New databases include an `orders(status, created_at)` index for timeout scans; existing databases can run `database/migrate_order_timeout.sql`.
- Order-service now starts an internal timeout worker that periodically calls `expirePendingOrders` with configurable timeout, batch size, and interval.
- Timeout worker prevents overlapping runs and writes structured lifecycle/completion/error logs.
- Refund request state machine now defines refundable order statuses and valid refund transitions.
- Users can create idempotent refund requests through `POST /refunds`; duplicate full-refund applications return the existing request.
- Refund review flow can move requests through approved/rejected/refunding/refunded/failed states and writes audit events.
- Refund submission now goes through a provider abstraction when moving approved refunds to `refunding`.
- Mock refunds return local provider refund IDs for staging; WeChat Pay/Alipay refund providers validate config and fail clearly until SDK integration is implemented.
- Refund callback entrypoint now exists at `POST /refund/callback/:provider` and is intentionally public for provider servers.
- Mock refund callbacks can move `refunding` requests to `refunded` or `failed` through an idempotent callback processor.
- Duplicate refund callbacks increment `duplicate_count` and do not update refund requests or audit events a second time.
- Provider-driven refund events use nullable `operator_id` so system callbacks do not depend on a fake user id.
- Static payment/refund routes are registered before generic `/:id` order routes to avoid route shadowing.
- Shared auth now supports role-gated middleware through JWT `role`; missing roles default to `customer`.
- Refund review now requires both authentication and an `admin` or `merchant` role, while customer refund requests remain user-authenticated.
- User schema, seed data, login/refresh token payloads, and existing-database migration now include `users.role` for permission checks.
- Merchant JWTs can carry `merchantId` scope from approved merchant records, and merchant refund reviews are limited to refunds whose order items all belong to that merchant.
- Admin refund reviews bypass merchant ownership scope, while merchant reviews without `merchantId` or against another merchant's order return 403.
- Formal merchant binding now uses `merchant_users` for approved user-to-merchant membership instead of inferring merchant identity from contact phone at login time.
- Legacy merchant contact-phone matching remains only as an existing-database backfill path in `database/migrate_user_roles.sql`.
- Admin and merchant fulfillment can ship paid orders through `PUT /:id/ship`; the route requires authentication plus `admin` or `merchant` role.
- Merchant shipping is scoped to orders whose items all belong to the merchant in the operator JWT; admin shipping bypasses merchant ownership scope.
- Shipping moves orders from `paid` to `shipped` and creates or updates the order's `logistics_tracking` row with company, tracking number, status, and shipped time.
- Admin and merchant refund management now has backend read APIs: `GET /refunds` for paged/status-filtered lists and `GET /refunds/:id` for refund details.
- Refund detail APIs return the refund record with order payment/shipping snapshot fields, order items, and refund event timeline for review/audit screens.
- Merchant refund list/detail reads are scoped by product merchant ownership; merchants without `merchantId` or requesting another merchant's refund receive 403.
- Shared auth now supports permission-point middleware through `requirePermission(...)` in addition to coarse role checks.
- Admin users default to all permissions; merchant users default to scoped backend permissions for refund list/detail/review, refund submit, order shipping, and product management.
- Refund list/detail/review routes and merchant/admin shipping now require both role and permission checks, such as `refund:list`, `refund:detail`, `refund:review`, and `order:ship`.
- New databases and existing-database migrations now include `role_permissions` and `user_permissions` for database-backed permission configuration.
- Seed data grants default permissions for admin, merchant, and customer roles, including merchant refund management and shipping permissions.
- Auth user lookup queries aggregate role/user permissions from the database and include normalized permissions in access and refresh tokens.
- Auth-service now exposes admin-only permission management APIs: `GET /permissions/roles` and `PUT /permissions/roles/:role`.
- Role permission updates are protected by `admin` plus `permission:manage`, replace role permissions transactionally, and write `permission_audit_logs`.
- Customer after-sales evidence metadata can be attached to refund requests through `POST /refunds/:id/evidence` and returned from refund detail APIs for review.
- Refund evidence upload intent API now exists at `POST /refunds/:id/evidence/upload-intent`, validates refund ownership plus file type/size, and returns a mock local upload contract for frontend integration.
- Refund evidence metadata now persists audit fields including object key, content type, file size, and checksum, and refund detail APIs return those fields to reviewers.
- Refund evidence now carries scan status fields (`scan_status`, `scan_result`, `scanned_at`); newly submitted evidence defaults to `pending` until a scanner integration updates it.
- Admin evidence scan results can now be written through `PUT /refunds/evidence/:evidenceId/scan`, updating evidence to `pending`, `passed`, `failed`, or `quarantined` with a result message and scan time.
- Automated scanner integrations can now call `POST /refunds/evidence/scan/callback` with `x-scanner-timestamp` and `x-scanner-signature`; the signature is verified with `REFUND_EVIDENCE_SCANNER_SECRET` and the timestamp is checked against `REFUND_EVIDENCE_SCANNER_TIMESTAMP_TOLERANCE_SECONDS` before scan results are persisted.
- Scanner callbacks now require `x-scanner-nonce` or a payload callback id, and `refund_evidence_scan_callback_records` stores callback idempotency so duplicate scanner retries do not update evidence repeatedly.
- Refund approval now checks evidence scan results inside the review transaction: if a refund has evidence, every evidence item must be `passed` before approval, unless an admin explicitly sets `evidenceScanBypass: true` for a manual risk override.
- Admin manual scan bypass now requires a non-empty review note and writes a dedicated `refund_review_audit_logs` record with operator, merchant scope, action, decision, note, and evidence ids.
- Refund evidence now stores retention metadata (`retention_policy`, `retention_days`, `retention_expires_at`, `cleanup_eligible`) when customer evidence is attached; `REFUND_EVIDENCE_RETENTION_DAYS` defaults to 180 for local/staging.
- Refund detail APIs now return evidence retention metadata so future admin/ops screens can show retention status before cleanup execution is enabled.
- Customer Android order list now exposes an after-sales entry for paid/shipped/completed orders and opens a refund evidence screen wired to the current backend refund APIs.
- Customer Android mock evidence flow can create a refund request, request an upload intent, display selected mock file metadata, and submit evidence metadata without real OSS/COS/S3 credentials or native file-picker dependencies.
- Real file-picker design spike is documented in `docs/refund-evidence-file-picker-spike.md`, including dependency recommendation, Android permission notes, upload state machine, retry rules, and user-provided storage inputs needed before implementation.
- Customer Android refund evidence screen now clearly states that the current flow uses mock evidence and will not read local gallery or document files before the real file picker and object storage upload are connected.
- Merchant/admin refund review UI foundation now exists in the app with list filters, refund detail loading, order items, evidence scan status, retention metadata, event timeline, approve/reject actions, and manual scan-bypass control.
- Operational API examples now document the local refund evidence flow, scanner callback HMAC signature contract, admin scan update, manual approval bypass, mock payment/refund callbacks, and retention cleanup dry-run expectations in `docs/operational-api-examples.md`.
- Project boundary documentation now marks `frontend/` and `backend/microservices/` as active enterprise work lines, while `mobile/`, `backend/src/`, and `frontend/tools/legacy-fixes/` remain historical/read-only until an owner cleanup decision is made.
- Retention cleanup dry-run API now lets admins list expired, cleanup-eligible refund evidence without mutating or deleting evidence rows.
- Frontend lint cleanup reduced the active app baseline from 50 warnings to 0 warnings while preserving the Android bundle build.
- Merchant/admin refund review now includes keyword search for order numbers and refund reasons, passing the filter through the current refund list API.
- Merchant/admin refund review now exposes a local export placeholder action backed by `GET /orders/refunds/export-placeholder`; it reuses refund list permissions and filter semantics but intentionally does not generate files yet.
- Permission management UI foundation now exists in the active app, with role switching, permission-point loading, checkbox editing, and save wiring to existing auth-service permission APIs.
- Merchant operations entry points now include the permission management screen alongside refund review.
- Logistics provider local skeleton now exists in `order-service`, with mock mode as the default, Kuaidi100 configuration validation, normalized tracking-event shape, clear 501 behavior for real provider modes, and tests.
- Shipping now calls the logistics provider skeleton after local tracking rows are created or updated, while preserving the existing shipping API response shape.
- Fulfillment order list API now exists at `GET /orders/fulfillment/orders`, protected by `admin` or `merchant` plus `order:ship`, with merchant ownership scoping and local tracking snapshots.
- Merchant/admin shipping management UI now exists in the active app with paid/shipped/completed filters, keyword search, shipment submission, and local logistics trace review.
- Enterprise operation-log foundation now exists with `operation_logs`, local migration coverage, operation-log query APIs, and an Operations Center list view.
- Export job placeholders now exist with `export_jobs`, local migration coverage, create/list APIs, operation-log recording for export requests, and an Operations Center create/list UI.
- Permission management UI is hardened with permission diff preview, explicit confirm-save step, and recent permission audit log visibility backed by `GET /auth/permissions/audits`.
- Permission token invalidation scaffolding now exists locally: login/refresh tokens carry `permissionVersion`, role permission updates increment `permission_versions`, and auth-service can detect stale permission tokens without enforcing rejection in shared middleware yet.
- Retention cleanup worker skeleton now exists in disabled dry-run mode, records `retention_cleanup_runs`, writes operation logs, and does not delete or mutate evidence rows.
- Operation logs now cover evidence scan updates and shipment edits in addition to export requests and retention cleanup dry-runs.
- Launch checklist script now runs backend Node tests, minimum launch preflight, and provider readiness in fail-fast order through `npm run checklist:launch`.
- Production configuration guide now documents the launch goal, required user-provided values, `.env.production.local` setup, migrations, validation commands, Android signing, and remaining provider implementation blockers in `docs/production-configuration-guide.md`.
- New databases get `refund_requests`, `refund_events`, `refund_evidence`, `refund_review_audit_logs`, `refund_evidence_scan_callback_records`, and `refund_callback_records` from `schema.sql`; existing databases can run `database/migrate_refunds.sql`.

## Required External Configuration

- WeChat Pay merchant account, API v3 key, certificates, and callback domain.
- Alipay open platform app, private key, public key, and callback domain, if Alipay is required.
- WeChat/QQ login app credentials, if third-party login is required.
- Logistics provider credentials, such as Kuaidi100, Cainiao, SF, JD Logistics, or another provider.
- Refund evidence scanner callback secret shared with the scanning service, configured as `REFUND_EVIDENCE_SCANNER_SECRET`; timestamp tolerance can be adjusted with `REFUND_EVIDENCE_SCANNER_TIMESTAMP_TOLERANCE_SECONDS`.
- Refund evidence retention days can be configured with `REFUND_EVIDENCE_RETENTION_DAYS`; the current default is 180 days and deletion remains disabled until final business/legal retention rules are confirmed.
- Xiaomi app store developer account, app signing plan, privacy policy URL, and compliance materials.
- Refund, after-sales, and finance reconciliation requirements from the business owner.

## Open Issues Annotated

- P0 payment production gap: payment provider abstraction exists, but real WeChat Pay/Alipay prepay, SDK signature verification, callback decryption, refund submission, and finance reconciliation flows are still not implemented.
- P0 refund production gap: refund requests, review transitions, mock refund submission, and mock refund callbacks can be recorded, but real provider refund SDK submission, real callback verification, and reconciliation are still not implemented.
- P0 real callback gap: real WeChat Pay/Alipay payment and refund callbacks still return clear not-implemented errors after configuration validation until provider SDK signature/decryption verification is wired.
- P1 fulfillment gap: merchant/admin shipping can write local logistics tracking records and now calls a local logistics provider skeleton, but real provider API integration, waybill subscription callbacks, trace synchronization, abnormal package handling, and delivery completion callbacks are still not implemented.
- P1 operations gap: order timeout worker is wired inside order-service; production still needs log monitoring, alerting, retry/dead-letter policy, and a decision on whether to keep in-process scheduling or move it to a dedicated worker process.
- P1 after-sales gap: after-sales/refund state machine foundation, role isolation, formal merchant binding, merchant-scoped shipping, refund read APIs, customer evidence metadata, and customer Android mock evidence submission exist, but provider SDK execution, real file upload, real scanner execution, and reconciliation are not production-ready.
- P1 storage gap: refund evidence upload intent now validates type/size, evidence metadata stores object key/content type/file size/checksum, scan status fields exist, admin scan result updates are available, signed scanner callbacks update scan results with timestamp tolerance and nonce/idempotency storage, approval is blocked by unpassed evidence, admin bypasses write dedicated audit logs, retention metadata is stored, admin dry-run cleanup reporting exists, and a disabled dry-run cleanup worker skeleton records run logs. Production still needs real OSS/COS/S3 signing, a real antivirus/compliance scanner engine, and final retention/deletion policy approval before any deletion enforcement.
- P1 permission operations gap: admin/merchant operations now have backend permission-point gates, database permission tables, permission-management APIs, permission-change audit logs, frontend permission-management hardening, local token-version invalidation scaffolding, and operation logs for permission/export/refund/shipment/retention actions. Production still needs a confirmed session enforcement policy, safer approval workflow, and export/search hardening.
- P1 frontend console gap: merchant/admin refund review, keyword search, export placeholder, permission UI foundation, shipping management, and local logistics trace review exist, but real export generation, role-specific workflows, and hardened audit/operation-log screens are not complete enough for daily operations teams.
- P2 frontend quality gap: frontend lint now reports 0 warnings and 0 errors; future work should keep this clean baseline enforced before app-store or enterprise delivery.
- P2 Android/Xiaomi release gap: Android JS bundle can be generated, but release signing is skipped without `frontend/android/keystore.properties`; Xiaomi app-store readiness still requires privacy compliance, permissions disclosure, release keystore, app signing plan, and real-device compatibility testing.

## Next Linked Work Items

The latest after-sales work closed the backend metadata path: a customer can attach evidence URLs to a refund request, and admin/merchant refund detail responses include that evidence for review. The remaining work should now move from metadata to production-grade file handling and operational workflows.

1. Storage provider signing: replace the mock refund evidence upload contract with real OSS/COS/S3-compatible signing. Required configuration already has provider, bucket, region, endpoint, access key, secret key, public CDN base URL, allowed MIME types, max file size, and upload expiration seconds.
2. Evidence risk controls: evidence now persists checksum/content type/file size, scan status fields, signed scanner callbacks with timestamp tolerance and nonce/idempotency storage, approval blocking for unpassed evidence, dedicated audit logs for admin bypass, and retention metadata; next add a real antivirus/compliance scanner engine, retention policy approval, and cleanup enforcement.
3. Customer refund UI: mock Android flow is wired from order list to refund request, upload intent, and evidence metadata submission; the screen now states the mock boundary clearly and the real file-picker design spike is documented. Next upgrade it to real local photo/video/document picking and real object-storage upload once dependency and storage decisions are confirmed.
4. Merchant/admin review UI: foundation is wired with refund filters, keyword search, export placeholder, detail view, evidence scan status, retention metadata, timeline, and approve/reject actions. Next add real export generation and fuller operation-log review surfaces.
5. Done locally: operation logs now record evidence scan updates, refund review decisions, shipment edits, export requests, and retention cleanup dry-runs.
6. Review audit hardening: continue expanding refund decision metadata beyond the local baseline, including evidence ids inspected, structured rejection reason templates, and risk-review categories.
7. Logistics provider closure: local provider skeleton now exists. Next add provider callback routes, trace persistence/update rules, abnormal-package states, delivery completion transitions, and real provider adapters after logistics contracts are selected.
8. Payment/refund provider closure: real WeChat Pay/Alipay SDK calls, callback signature/decryption verification, refund submission, and reconciliation remain P0 before production payment can be enabled.
9. Android/Xiaomi release track: prepare `frontend/android/keystore.properties`, privacy policy URL, permissions disclosure, real-device test matrix for common Xiaomi/Redmi devices, and app-store compliance materials.
10. Frontend quality baseline: keep `npm run lint` at 0 warnings and 0 errors before app-store or enterprise handoff.
11. Production operations: decide whether order timeout and reconciliation jobs remain in-process or move to dedicated workers, then add alerting, retries, dead-letter handling, and dashboards.

Recommended next implementation batch: continue no-external-resource enterprise console work with operation-log foundations and export job placeholders before real provider credentials are available.

## Can Continue Without External Accounts

These items do not require payment accounts, cloud credentials, Xiaomi developer access, or physical devices, so they should be completed first:

1. Done in this batch: retention policy metadata now stores evidence retention days, expiry time, cleanup eligibility, and config default; deletion execution is still intentionally disabled until business retention rules are confirmed.
2. Done in this batch: Customer Android evidence flow with mock upload can request upload intent, show selected file metadata, and submit evidence metadata from the order list after-sales entry.
3. Done in this batch: Merchant/admin refund review UI foundation shows refund detail, evidence scan status, order items, retention metadata, and audit timeline using current backend APIs.
4. Done in this batch: Frontend lint baseline is reduced from 50 warnings to 0 warnings and should remain enforced.
5. Done in this batch: Operational docs now include local API examples for scanner callbacks, refund review bypass, evidence upload flow, mock payment/refund callbacks, and future retention cleanup dry-run.
6. Done in this batch: Active vs legacy project boundaries are documented for future implementation batches.
7. Done in this batch: Retention cleanup dry-run API reports expired cleanup-eligible evidence without enabling deletion.
8. Done in this batch: Refund review keyword search and export placeholder are wired through frontend and backend permission gates without generating local files.
9. Done in this batch: Permission management UI foundation is wired to existing auth-service permission APIs.
10. Done in this batch: Logistics provider local skeleton is wired into shipping while real provider calls remain blocked by credentials and contracts.
11. Done in this batch: Fulfillment order list API and merchant/admin shipping management UI are wired to local tracking rows.
12. Done in this batch: Operation-log foundations and export job placeholders are wired through backend APIs and Operations Center UI.
13. Next local enterprise work: harden permission management with diff preview, confirmation, and audit-log visibility.
14. Done in this batch: Token invalidation scaffolding after permission changes is implemented with role permission versions and stale-token detection; hard rejection remains disabled until session policy is approved.
15. Next local docs work: add provider-specific logistics/payment/refund examples only after external contracts or sandbox credentials are available.

## Enterprise Development Task Checklist

### Local Tasks That Can Continue Now

1. Done: add operation-log foundations for permission changes, refund review decisions, evidence scan updates, export requests, shipment edits, and retention cleanup dry-runs.
2. Add export job placeholders for refunds, orders, permission audits, and operation logs, with status records and download-disabled local responses.
3. Harden permission management UI with diff preview, confirmation step, role-specific descriptions, and audit-log visibility.
4. Done: add token invalidation design and local scaffolding after permission changes, while keeping production rollout disabled until session policy is approved.
5. Done: add customer evidence upload design spike for real file picker, progress, retry/cancel, and Android permission review without committing to a dependency yet.
6. Done: add retention cleanup worker skeleton in disabled/dry-run mode, including run records and operation logs, but no deletion execution.
7. Done: add local launch checklist script for backend tests, launch preflight, and provider readiness.
8. Done: add production configuration guide with detailed goals, required inputs, setup steps, checks, and remaining implementation blockers.
9. Keep frontend lint at 0 warnings and expand frontend contract tests as console surfaces grow.
10. Keep backend service tests and migration tests synchronized with every new local table, route, and permission point.

### Blocked Until External Resources Or Owner Decisions

1. Real WeChat Pay and Alipay payment/refund SDK integration, callback verification/decryption, sandbox validation, and finance reconciliation.
2. Real OSS/COS/S3 upload signing, CDN delivery, lifecycle rules, and private/public access policy.
3. Real antivirus/compliance scanner dispatch, quarantine policy, retries, dead-letter handling, and alerting.
4. Real logistics provider subscription/callback integration and provider-specific abnormal-package handling.
5. Retention deletion enforcement after legal/business approval of hard-delete, soft-delete, archive, or quarantine behavior.
6. Android release signing, Xiaomi app-store materials, privacy compliance, and real-device compatibility testing.
7. Security decision on tracked `nginx/ssl/server.key` and `nginx/ssl/server.crt` provenance and rotation.
8. Ownership decision for `backend/src/`, `mobile/`, and `frontend/tools/legacy-fixes/`: keep as reference, archive, migrate, or delete through a dedicated cleanup plan.

## Requires User-Provided External Resources

These items should stay blocked until credentials, accounts, or devices are provided:

1. Real WeChat Pay/Alipay prepay, callback verification/decryption, refund SDK submission, and reconciliation: requires merchant accounts, keys, certificates, and callback domains.
2. Real OSS/COS/S3 upload signing and CDN delivery: requires bucket, region, endpoint, access key, secret key, CDN/public base URL, and retention policy approval.
3. Real antivirus/compliance scanner integration: requires scanner vendor/API endpoint, shared secret or mTLS material, result schema, and quarantine policy.
4. Retention deletion enforcement: requires final business/legal retention policy, cleanup review workflow, and confirmation of whether evidence should be hard-deleted, soft-deleted, archived, or quarantined after expiry.
5. Logistics provider sync/callbacks: requires provider account, API keys, callback domain, waybill/tracking contract, and abnormal package policy.
6. Xiaomi release readiness: requires `frontend/android/keystore.properties`, release keystore, Xiaomi developer account, privacy policy URL, permissions disclosure, and real Xiaomi/Redmi test devices.

## Verification Commands

Current verification evidence:

```powershell
node --test frontend/tests/refund-evidence-flow.test.js
# 2026-07-01: passed, 1 passed, 0 failed after Android mock refund evidence flow wiring.

node --test frontend/tests/merchant-refund-review-flow.test.js frontend/tests/refund-evidence-flow.test.js
# 2026-07-01: passed, 2 passed, 0 failed after merchant/admin refund review UI foundation.

node --test backend/microservices/order-service/order-routes.test.js backend/microservices/order-service/services/order.service.test.js
# 2026-07-01: passed, 40 passed, 0 failed after retention cleanup dry-run API implementation.

npm run lint
# 2026-07-01: passed with 0 errors and 0 warnings after frontend lint cleanup.

node --test backend/microservices/order-service/services/order.service.test.js backend/microservices/tests/payment-schema.test.js backend/microservices/tests/refund-migration.test.js
# 2026-07-01: passed, 39 passed, 0 failed after retention metadata implementation.

npm run test:node
node --test backend/microservices/order-service/payment-callback.test.js
node --test backend/microservices/order-service/payment-callback-processor.test.js
node --test backend/microservices/order-service/order-timeout-processor.test.js
node --test backend/microservices/order-service/order-timeout-worker.test.js
node --test backend/microservices/order-service/order-routes.test.js
node --test backend/microservices/order-service/refund-callback.test.js
node --test backend/microservices/order-service/refund-callback-processor.test.js
node --test backend/microservices/order-service/controllers/order.controller.test.js
node --test backend/microservices/order-service/services/order.service.test.js
node --test backend/microservices/order-service/refund-processor.test.js
node --test backend/microservices/order-service/refund-provider.test.js
node --test backend/microservices/order-service/refund-state-machine.test.js
node --test backend/microservices/auth-service/services/auth-role-query.test.js
node --test backend/microservices/tests/order-timeout-migration.test.js
node --test backend/microservices/tests/payment-schema.test.js
node --test backend/microservices/tests/payment-migration.test.js
node --test backend/microservices/tests/refund-migration.test.js
node --test backend/microservices/tests/user-role-migration.test.js
node --check backend/microservices/order-service/payment-provider.js
node --check backend/microservices/order-service/payment-callback.js
node --check backend/microservices/order-service/payment-callback-processor.js
node --check backend/microservices/order-service/order-timeout-processor.js
node --check backend/microservices/order-service/order-timeout-worker.js
node --check backend/microservices/order-service/refund-processor.js
node --check backend/microservices/order-service/refund-provider.js
node --check backend/microservices/order-service/refund-callback.js
node --check backend/microservices/order-service/refund-callback-processor.js
node --check backend/microservices/order-service/refund-state-machine.js
node --check backend/microservices/order-service/index.js
node --check backend/microservices/auth-service/auth-utils.js
node --check backend/microservices/auth-service/services/auth.service.js
node --check backend/microservices/shared/index.js
node --check backend/microservices/order-service/services/order.service.js
docker compose config
powershell -ExecutionPolicy Bypass -File scripts/quality-check.ps1
docker compose build auth-service
docker compose build order-service
```

Latest local evidence:

- `node --test backend/microservices/order-service/payment-callback.test.js`: passed, 6 tests.
- `node --test backend/microservices/auth-service/auth-routes.test.js`: passed, 2 tests.
- `node --test backend/microservices/auth-service/controllers/auth.controller.test.js`: passed, 2 tests.
- `node --test backend/microservices/order-service/payment-callback-processor.test.js`: passed, 3 tests.
- `node --test backend/microservices/order-service/order-timeout-processor.test.js`: passed, 3 tests.
- `node --test backend/microservices/order-service/order-timeout-worker.test.js`: passed, 4 tests.
- `node --test backend/microservices/order-service/order-routes.test.js`: passed, 12 tests.
- `node --test backend/microservices/order-service/refund-callback.test.js`: passed, 5 tests.
- `node --test backend/microservices/order-service/refund-callback-processor.test.js`: passed, 4 tests.
- `node --test backend/microservices/order-service/controllers/order.controller.test.js`: passed, 8 tests.
- `node --test backend/microservices/order-service/refund-processor.test.js`: passed, 11 tests.
- `node --test backend/microservices/order-service/refund-provider.test.js`: passed, 3 tests.
- `node --test backend/microservices/order-service/refund-state-machine.test.js`: passed, 5 tests.
- `node --test backend/microservices/order-service/services/order.service.test.js`: passed, 26 tests.
- `node --test backend/microservices/order-service/refund-evidence-upload.test.js`: passed, 4 tests.
- `node --test backend/microservices/order-service/refund-evidence-scan-callback.test.js`: passed, 5 tests.
- `node --test backend/microservices/shared/index.test.js`: passed, 10 tests.
- `node --test backend/microservices/auth-service/services/auth-role-query.test.js`: passed, 1 test.
- `node --test backend/microservices/tests/permission-seed.test.js`: passed, 1 test.
- `node --test backend/microservices/tests/order-timeout-migration.test.js`: passed, 1 test.
- `node --test backend/microservices/tests/payment-schema.test.js`: passed, 12 tests.
- `node --test backend/microservices/tests/payment-migration.test.js`: passed, 1 test.
- `node --test backend/microservices/tests/refund-migration.test.js`: passed, 1 test.
- `node --test backend/microservices/tests/user-role-migration.test.js`: passed, 4 tests.
- `npm run test:node` from `backend/microservices`: passed, 176 tests.
- `docker compose config`: passed with a temporary local `REDIS_PASSWORD`.
- `powershell -ExecutionPolicy Bypass -File scripts/quality-check.ps1` with temporary local `REDIS_PASSWORD`, `REFUND_EVIDENCE_SCANNER_SECRET`, and `REFUND_EVIDENCE_SCANNER_TIMESTAMP_TOLERANCE_SECONDS`: passed; Android JS bundle generated, backend Node tests passed with 176 passed and 0 failed, frontend lint still reports 50 warnings and 0 errors, and Android release signing was skipped because `frontend/android/keystore.properties` was not provided.
- `node --test frontend/tests/merchant-refund-review-flow.test.js frontend/tests/refund-evidence-flow.test.js`: passed, 2 tests.
- `docs/pending-issues.md`: added as the consolidated unresolved-issues backlog after the full check.
- `docker compose build auth-service`: passed and built `e_commerce-auth-service:latest`.
- `docker compose build order-service`: passed and built `e_commerce-order-service:latest`.
- `git diff --check`: passed after whitespace cleanup; only Windows line-ending warnings were emitted.

Provider sandbox and staging verification commands still need to be added when real WeChat Pay or Alipay accounts are available.

## Rollout Notes

Do not enable real payment until sandbox callbacks, duplicate callback idempotency, refund paths, reconciliation, and order compensation have been tested end-to-end.
