# Project Boundaries

Last updated: 2026-07-01 Asia/Shanghai.

This document defines which parts of the repository are active for the current enterprise-readiness work and which parts should be treated as historical until the owner explicitly reactivates or removes them.

## Active Runtime Lines

### Mobile App

Active line: `frontend/`

Purpose:

- React Native Android app used by the current customer, merchant, and admin flows.
- Current API client points to the gateway under `/api`.
- Android bundle and lint checks are run from this directory.
- New Android/Xiaomi compatibility work should start here.

Important files:

- `frontend/src/config/env.js`: local/emulator/production API base URL selection.
- `frontend/src/api/`: active frontend API contracts.
- `frontend/src/screens/`: active app screens, including refund evidence and merchant refund review foundations.
- `frontend/android/`: active Android native project and signing configuration location.
- `frontend/tests/`: active contract-style frontend tests.

### Backend Services

Active line: `backend/microservices/`

Purpose:

- Current runtime backend behind the API gateway.
- Contains auth, user, product, order, message, search, and gateway services.
- New enterprise work should target these services unless a migration plan says otherwise.

Important files:

- `backend/microservices/gateway/`: active API gateway, exposed through Docker Compose as host port `4100`.
- `backend/microservices/order-service/`: active order, payment, refund, evidence, logistics, and timeout-worker logic.
- `backend/microservices/auth-service/`: active login, token, role, and permission management logic.
- `backend/microservices/shared/`: shared auth, response, logging, Redis, and asset helpers.
- `backend/microservices/scripts/run-node-tests.js`: deterministic backend Node test entrypoint.

### Database And Infra

Active lines:

- `database/schema.sql`
- `database/seed.sql`
- `database/migrate_*.sql`
- `docker-compose.yml`
- `nginx/nginx.conf`
- `scripts/quality-check.ps1`

Purpose:

- Current schema, seed data, migration scripts, Docker orchestration, gateway/Nginx config, and local quality checks.
- Schema and migration changes must stay synchronized when adding production-facing tables or indexes.

## Historical Or Read-Only Lines

### Legacy Monolith Backend

Path: `backend/src/`

Current status:

- Historical monolith-style backend reference.
- It still contains routes/controllers that may be useful for reference, but it is not the active enterprise runtime line.

Rules:

- Do not add new enterprise features here unless the owner explicitly reactivates this backend.
- Do not delete it without a separate cleanup decision.
- If behavior differs between `backend/src/` and `backend/microservices/`, treat `backend/microservices/` as authoritative for current work.

### Legacy Or Experimental Mobile App

Path: `mobile/`

Current status:

- Historical or experimental app line.
- It is not part of the current Android bundle, lint, or enterprise after-sales work.

Rules:

- Do not add Xiaomi/Android release work here unless the owner explicitly reactivates it.
- Keep it read-only for audit/reference until a migration or deletion decision is made.
- Current user-facing mobile work belongs in `frontend/`.

### Legacy Fix Scripts

Path: `frontend/tools/legacy-fixes/`

Current status:

- Historical repair scripts kept for auditability.
- They are not part of the normal build, lint, or app runtime.

Rules:

- Do not run these scripts as part of normal development unless a specific historical repair needs to be reproduced.
- Do not extend them for new product behavior.
- Prefer targeted code edits and tests in the active app line.

## Current Local Quality Boundary

The current quality baseline is:

```powershell
$env:REDIS_PASSWORD='local-quality-only-redis-password'
$env:REFUND_EVIDENCE_SCANNER_SECRET='local-quality-only-scanner-secret'
$env:REFUND_EVIDENCE_SCANNER_TIMESTAMP_TOLERANCE_SECONDS='300'
powershell -ExecutionPolicy Bypass -File scripts/quality-check.ps1
```

Expected scope:

- Validates Docker Compose config.
- Generates the active frontend Android JS bundle.
- Runs active backend microservice Node tests.
- Runs active frontend lint.
- Skips Android release build until `frontend/android/keystore.properties` is provided.

Known current baseline:

- Backend Node tests pass.
- Frontend lint has warnings but no errors.
- Android JS bundle builds.
- Android release signing remains blocked by missing keystore config.

## Decision Items Still Needing Owner Input

1. Whether to keep `backend/src/` as long-term reference, archive it, or migrate any missing useful behavior into `backend/microservices/` and remove it later.
2. Whether to keep `mobile/` as an experimental app line, archive it, or remove it after confirming no active features depend on it.
3. Whether the tracked `nginx/ssl/server.key` and `nginx/ssl/server.crt` are disposable local development files. If not, rotate credentials and replace them with a generated local-cert workflow.
4. Whether Android release signing should use a locally managed keystore, CI-managed encrypted secrets, or a store-managed signing flow.

## Working Rule For Future Batches

Until the owner makes a cleanup decision, the agent should:

- Implement backend work in `backend/microservices/`.
- Implement mobile app work in `frontend/`.
- Keep `backend/src/`, `mobile/`, and `frontend/tools/legacy-fixes/` read-only except for explicit cleanup tasks.
- Record unresolved cleanup and ownership questions in `docs/pending-issues.md` instead of silently deleting or rewriting historical code.
