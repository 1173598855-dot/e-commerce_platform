# Pending Issues

Last full check: 2026-07-01 Asia/Shanghai.

This document is the active backlog of issues that remain after the Phase 1-3 hardening work. It separates items that can be continued locally from items that require external accounts, credentials, policy decisions, or devices.

## Latest Verification Snapshot

- `scripts/quality-check.ps1` passed with temporary local `REDIS_PASSWORD`, `REFUND_EVIDENCE_SCANNER_SECRET`, and `REFUND_EVIDENCE_SCANNER_TIMESTAMP_TOLERANCE_SECONDS`.
- Backend microservices Node test suite passed: 176 passed, 0 failed.
- Frontend Android JS bundle generation passed after adding the merchant/admin refund review foundation.
- Frontend lint now passes with 0 errors and 0 warnings after low-risk unused-code and hook-dependency cleanup.
- `frontend/tests/refund-evidence-flow.test.js` and `frontend/tests/merchant-refund-review-flow.test.js` passed: 2 passed, 0 failed.
- Android JS bundle generation passed after frontend lint cleanup.
- `docs/operational-api-examples.md` now documents local refund evidence flow, scanner callback HMAC signing, review bypass, mock payment/refund callbacks, and retention cleanup dry-run expectations.
- `docs/project-boundaries.md` now documents active vs historical project lines so future work targets `frontend/` and `backend/microservices/` by default.
- Retention cleanup dry-run API now exists at `GET /orders/refunds/evidence/retention/cleanup-dry-run`; related order route/service tests passed locally.
- Refund review keyword search and export placeholder are wired through frontend and backend permission gates; export intentionally returns metadata only and does not generate files locally.
- Permission management UI foundation is wired to existing auth-service permission APIs with role switching, permission loading, checkbox editing, and save.
- Logistics provider local skeleton is wired into shipping with mock mode, Kuaidi100 configuration validation, normalized event shape, and clear not-implemented behavior for real provider modes.
- Fulfillment order list API and merchant/admin shipping management UI are wired to local tracking rows, including paid/shipped/completed filters, shipment submission, and local logistics trace review.
- Operation-log foundations and export job placeholders are wired through backend APIs and Operations Center UI; export jobs remain local metadata only and do not generate files.
- Permission management UI now includes diff preview, explicit confirm-save, and recent permission audit log visibility.
- Permission token invalidation scaffolding is implemented locally: tokens include `permissionVersion`, role permission updates advance `permission_versions`, and auth-service can report stale tokens. Production rejection is intentionally not enabled until session policy is approved.
- Retention cleanup worker skeleton is implemented in disabled dry-run mode with run records and operation logs; it does not delete or mutate evidence rows.
- `git diff --check` passed; only Windows LF-to-CRLF warnings were emitted.
- Android release build was skipped because `frontend/android/keystore.properties` is not present.

## P0 Production Blockers

1. Real WeChat Pay and Alipay payment flows are not production-ready.
   - Current state: provider abstractions and mock payment flow exist; real provider modes validate config and then fail with clear not-implemented errors.
   - Remaining work: prepay/order creation SDK calls, callback signature verification/decryption, duplicate callback validation in sandbox, reconciliation, operational rollback playbooks.
   - Requires: merchant accounts, keys, certificates, callback domains, sandbox access.

2. Real refund provider execution is not production-ready.
   - Current state: refund request state machine, mock refund submission, mock callbacks, review flow, and idempotent callback records exist.
   - Remaining work: WeChat Pay/Alipay refund SDK submission, refund callback verification/decryption, refund reconciliation, failure compensation, finance audit exports.
   - Requires: payment provider credentials and finance/reconciliation rules.

3. Release signing and app-store readiness are blocked.
   - Current state: Android JS bundle builds; release build is intentionally skipped without signing config.
   - Remaining work: configure `frontend/android/keystore.properties`, release keystore, signing password handling, CI secret strategy, Xiaomi app-store materials, privacy policy URL, permissions disclosure.
   - Requires: release keystore, Xiaomi developer account, compliance materials, real Xiaomi/Redmi test devices.

4. Tracked TLS private key requires security review.
   - Current state: `nginx/ssl/server.key` and `nginx/ssl/server.crt` are tracked in git.
   - Risk: acceptable only if these are disposable local self-signed development files; unacceptable if they were ever used in staging or production.
   - Remaining work: confirm provenance, rotate any non-local certificate, replace tracked key with generated local dev cert workflow, update `.gitignore` for private key material.

## P1 Enterprise Readiness Gaps

1. Real object storage upload is not implemented.
   - Current state: refund evidence upload intent validates type/size and returns a mock upload contract.
   - Remaining work: OSS/COS/S3 signing, CDN/public URL handling, upload callback or client verification, object lifecycle policy, private bucket access strategy.
   - Requires: bucket, region, endpoint, access key, secret key, CDN/public base URL.

2. Real antivirus/compliance scanning is not implemented.
   - Current state: signed scanner callback endpoint exists with timestamp tolerance, nonce/idempotency, scan status fields, and approval blocking.
   - Remaining work: scanner vendor/API integration, upload-to-scan dispatch, quarantine policy, retry/dead-letter handling, alerting.
   - Requires: scanner endpoint/vendor, auth material, result schema, quarantine rules.

3. Retention deletion enforcement is not implemented.
   - Current state: retention metadata is stored on refund evidence, displayed in the merchant/admin refund review foundation, a read-only admin dry-run report exists, and a disabled dry-run worker skeleton records `retention_cleanup_runs` plus operation logs without deletion.
   - Remaining work: business/legal retention policy, soft-delete/archive/hard-delete decision, and audit logs for actual cleanup execution after policy approval.
   - Requires: final policy decision.

4. Logistics provider integration is still local-only.
   - Current state: merchant/admin shipping can write local logistics tracking records, and a logistics provider skeleton in order-service is called after local tracking rows are written.
   - Remaining work: provider callbacks, trace persistence rules, provider adapter implementation, abnormal package handling, delivery completion status updates.
   - Requires: logistics provider account, API keys, callback domain, tracking contract.

5. Admin/merchant operational frontend still needs production polish.
   - Current state: refund review foundation, keyword search, export placeholder, permission UI foundation, shipping management, local logistics trace review, and operation-log APIs/UI foundation exist.
   - Remaining work: real export generation, role-specific empty states, separate desktop/tablet layouts, richer operation-log drill-down, and audit timeline hardening.
   - Can continue locally with current APIs.

6. Permission operations need production hardening.
   - Current state: DB-backed permissions, audit logs, backend management APIs, frontend UI hardening, local permission-version stale-token detection, and operation logs for permission/export/refund/shipment/retention actions exist.
   - Remaining work: approve and enable a production session enforcement policy, safer permission-change workflow, and audit export/search.
   - Can continue locally except final policy details.

7. Order timeout and reconciliation jobs need production operations design.
   - Current state: in-process timeout worker exists and prevents overlapping runs.
   - Remaining work: decide in-process vs dedicated worker, monitoring, alerting, retries, dead-letter queues, dashboards.
   - Can continue locally for abstractions and docs; production rollout needs infra choices.

## P2 Quality And Compatibility Gaps

1. Frontend lint warning baseline is now clean.
   - Current state: frontend lint passes with 0 errors and 0 warnings.
   - Completed work: removed unused imports/state, fixed JSX quote/catch spacing warnings, and stabilized hook dependencies with `useCallback` where needed.
   - Remaining work: keep CI enforcing the clean baseline and avoid reintroducing warnings in future app-store handoff work.

2. Customer evidence upload still uses mock file selection.
   - Current state: Android customer flow can create refund, request mock upload intent, show mock file metadata, and submit evidence metadata.
   - Remaining work: real photo/video/document picker, runtime permission review, large-file progress, retry/cancel, offline/network failure handling.
   - Requires: dependency decision for native file picker and target Android permission policy.

3. Xiaomi/Android compatibility needs device validation.
   - Current state: Android bundle builds and MIUI-related theme entries exist.
   - Remaining work: test on common Xiaomi/Redmi models, Android 8-15 coverage, permission prompts, WebView/network behavior, low-memory behavior, notch/status-bar layout, release APK install/upgrade tests.
   - Requires: devices or device farm access.

4. Documentation examples need expansion beyond the new local operations baseline.
   - Current state: `docs/operational-api-examples.md` documents the runnable local refund evidence flow, scanner callback HMAC signing, refund review bypass, mock payment/refund callbacks, and planned retention cleanup dry-run behavior.
   - Remaining work: add concrete logistics callback examples after provider contract selection, add provider-specific WeChat Pay/Alipay sandbox examples after credentials are available, and convert retention cleanup from draft semantics to executable worker/runbook after policy approval.
   - Can continue locally for generic runbooks; provider-specific examples require external contracts.

5. Legacy app folders need final ownership decision after boundary documentation.
   - Current state: `docs/project-boundaries.md` marks `frontend/` and `backend/microservices/` as active, while `mobile/`, `backend/src/`, and `frontend/tools/legacy-fixes/` are read-only historical/reference lines until explicitly reactivated.
   - Risk: stale legacy code can still confuse future audits if it remains indefinitely.
   - Remaining work: owner decides whether to archive, delete, or migrate useful behavior from legacy directories through a separate cleanup plan.
   - Requires: repository ownership decision.

## Can Continue Without External Resources

1. Done: add operational API examples and scanner callback signature examples in `docs/operational-api-examples.md`.
2. Done: reduce frontend lint warnings from 50 to 0.
3. Done: add retention cleanup dry-run API and tests without enabling deletion.
4. Done: document active vs legacy project boundaries in `docs/project-boundaries.md`.
5. Done: add refund review keyword search and export placeholder.
6. Done: add permission management UI foundation.
7. Done: add logistics provider local skeleton and wire it into shipping.
8. Done: add fulfillment order list API and merchant/admin shipping management UI using local tracking rows.
9. Done: add operation-log foundations and export job placeholders with Operations Center UI.
10. Done: harden permission management with diff preview, confirmation, and audit-log visibility.
11. Done: add token invalidation scaffolding after permission changes, disabled until session policy is approved.
12. Done: add retention cleanup worker skeleton in disabled/dry-run mode with run records and operation logs.
13. Done: add operation logs for evidence scan updates, refund review decisions, shipment edits, export requests, and retention cleanup dry-runs.
14. Done: add real-file-picker design spike without committing to a dependency.
15. Done: add local launch checklist script that runs backend tests, launch preflight, and provider readiness in fail-fast order.
16. Done: add `docs/production-configuration-guide.md` with step-by-step production configuration goals, required inputs, commands, validation flow, and remaining implementation blockers.

## Requires User Input Or External Resources

1. Payment/refund provider credentials and callback domains.
2. Object storage credentials and CDN/public URL policy.
3. Scanner vendor/API contract and quarantine policy.
4. Logistics provider account/API/callback contract.
5. Retention legal/business policy.
6. Android release keystore and Xiaomi developer materials.
7. Real Xiaomi/Redmi device matrix or device-farm access.
8. Decision on tracked `nginx/ssl/server.key` provenance and rotation.
