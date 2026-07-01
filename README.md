# Xiaoyi Mall E-commerce Platform

A full-stack e-commerce project based on React Native, Node.js, MySQL, Redis, Nginx, and Docker. The current active backend line is `gateway + backend/microservices`; the active mobile app line is `frontend`.

## Architecture

```text
React Native App (frontend)
  -> Nginx (80/443)
    -> API Gateway (4100 -> 4000)
      -> auth-service    (4006)
      -> user-service    (4001)
      -> product-service (4002)
      -> order-service   (4003)
      -> mq-service      (4004)
      -> search-service  (4005)
    -> MySQL (3306)
    -> Redis (6379)
```

## Active Project Lines

- `frontend`: active React Native Android app.
- `backend/microservices`: active backend runtime.
- `backend/src`: historical monolith reference code.
- `mobile`: historical or experimental app line until explicitly reactivated.
- `frontend/tools/legacy-fixes`: historical repair scripts kept only for auditability.

## Required Local Configuration

Create local environment config from the template:

```powershell
Copy-Item .env.example .env
```

Fill in at least:

```text
DB_PASSWORD=...
JWT_SECRET=...
REDIS_PASSWORD=...
ASSET_BASE_URL=... # optional CDN/base URL for uploaded assets
SMS_PROVIDER=console # use aliyun/tencent only after credentials and SDK integration are ready
PAYMENT_PROVIDER=mock # use wechat/alipay only after merchant credentials and callbacks are ready
ORDER_PAYMENT_TIMEOUT_MINUTES=30 # pending orders older than this are auto-cancelled by order-service
```

Android release signing is intentionally blocked until a real keystore is configured. Copy and fill this file only when a real release keystore is available:

```powershell
Copy-Item frontend/android/keystore.properties.example frontend/android/keystore.properties
```

Do not commit `.env`, `frontend/android/keystore.properties`, `*.jks`, or `*.keystore`.

## Install Dependencies

Frontend:

```powershell
cd frontend
npm ci
```

Backend microservices:

```powershell
cd backend/microservices
npm ci
```

Each Dockerized microservice has its own `package-lock.json`; Docker builds use `npm ci --omit=dev` for reproducible production installs.

## Quality Checks

Run the baseline check from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/quality-check.ps1
```

The baseline check runs:

- `docker compose config`
- frontend Android JS bundle generation
- backend deterministic Node tests
- frontend lint

Android release build is skipped until signing is configured. After configuring a real keystore:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/quality-check.ps1 -AndroidRelease
```

## Docker

Validate configuration:

```powershell
docker compose config
```

Build service images:

```powershell
docker compose build
```

Start the local stack only after `.env` is configured:

```powershell
docker compose up -d
```

## CI

GitHub Actions workflow is defined in `.github/workflows/ci.yml`. It runs backend node tests, frontend lint, frontend bundle generation, Docker Compose config validation, and Docker image build smoke checks.

CI intentionally does not deploy and does not build Android release APKs until a secure keystore secret strategy is added.

## Production API

The app production API base URL is currently configured as:

```text
https://api.xiaoyimall.com/api
```

See `frontend/src/config/env.js`.

## Current Baseline Status

Completed in Phase 1:

- Weak default DB/JWT fallbacks removed from Docker Compose.
- Backend shared JWT fallback removed; `JWT_SECRET` is required.
- Redis password enforcement is enabled in Docker Compose; `REDIS_PASSWORD` is required.
- Android release no longer falls back to debug signing.
- Frontend Metro config dependency aligned with React Native 0.73.
- Frontend lint baseline added.
- Lockfiles are tracked for reproducible dependency installs.
- Dockerfiles use `npm ci` / `npm ci --omit=dev`.
- Local quality script and CI baseline are in place.

Known non-blocking issues are tracked in `docs/phase-1-engineering-baseline.md`.

## Next Phases

- Phase 2: runtime security and real integrations. Track in `docs/phase-2-runtime-security.md`.
- Phase 3: business closure, real payment, refund, logistics, and store readiness. Track in `docs/phase-3-business-closure.md`.
