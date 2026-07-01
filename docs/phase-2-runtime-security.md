# Phase 2 Runtime Security And Real Integrations

This phase starts after the Phase 1 engineering baseline. It focuses on production runtime safety, provider integrations, and deployable infrastructure behavior.

## Completed Changes

- Redis now requires `REDIS_PASSWORD` in Docker Compose.
- Redis health checks authenticate with the configured password.
- `auth-service` and `mq-service` pass `REDIS_PASSWORD` into the Redis client when it is configured.
- API Gateway rate limiting now uses Redis for shared multi-instance counters when Redis is available.
- API Gateway keeps an in-memory rate-limit fallback for temporary Redis startup or connection failures.
- API Gateway receives `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` from Docker Compose and waits for Redis health.
- A shared Redis client option helper keeps Redis host, port, and password behavior consistent across services.
- Backend node tests cover Redis client options with and without a password.
- Backend node tests cover Gateway Redis rate-limit counters and over-limit responses.
- `ASSET_BASE_URL` is available for CDN/object-storage public URL rewriting.
- Product, order, and user product-list responses normalize relative image paths to `ASSET_BASE_URL` when configured.
- Shared asset URL tests cover absolute URLs, relative upload paths, and local relative-path fallback.
- SMS sending now goes through a provider abstraction instead of direct `console.log` calls in auth-service.
- Console SMS mode redacts phone numbers and verification codes by default unless `SMS_CONSOLE_LOG_CODE=true` is explicitly set for local debugging.
- Aliyun/Tencent SMS configuration validation is in place, with a clear failure until the provider SDK integration is added.
- Shared structured logger emits JSON entries with `service`, `level`, `message`, `timestamp`, and request context fields.
- Logger redacts common sensitive fields and masks phone numbers before writing logs.
- API Gateway request, proxy, Redis limiter, startup, shutdown, and error logs now use structured logging.
- Gateway Docker build context now includes `shared/` so the gateway image can use shared runtime utilities.
- Nginx now hides version tokens, pins TLS 1.2/1.3, and sets TLS session cache/timeouts.
- Nginx health and API proxy locations consistently forward Host, real IP, forwarded-for, forwarded-proto, and request ID headers.
- Nginx upload migration response now includes explicit cache behavior, and the default 404 response is marked `no-store`.
- Backend node tests include Nginx production-config assertions.
- CI compose config and Docker build jobs now provide a CI-only Redis password value.

## Required External Configuration

- Production API domain, for example `api.xiaoyimall.com`.
- Valid HTTPS certificate and renewal plan.
- Production MySQL password and Redis password.
- Production MySQL and Redis host/port details if using managed cloud services instead of local Compose services.
- SMS provider credentials and approved SMS templates.
- For Aliyun SMS: `SMS_SIGN_NAME`, `SMS_TEMPLATE_CODE`, `SMS_ACCESS_KEY_ID`, and `SMS_ACCESS_KEY_SECRET`.
- For Tencent SMS: `SMS_SIGN_NAME`, `SMS_TEMPLATE_CODE`, `SMS_ACCESS_KEY_ID`, `SMS_ACCESS_KEY_SECRET`, and `SMS_APP_ID`.
- Public asset CDN/base URL, for example `https://cdn.xiaoyimall.com`.
- Object storage provider, bucket, region, endpoint, and access credentials for uploaded assets.
- Crash/error reporting project key, such as Bugly or Sentry.
- Log aggregation target, such as cloud log service or self-hosted stack.

## Open Issues Annotated

- Upload API is still not connected to a real object-storage SDK; only public URL rewriting is in place.
- Auth and chat avatar responses still need CDN URL normalization after the main product/order paths.
- SMS provider SDK calls are not implemented yet; `aliyun` and `tencent` fail clearly after config validation until the exact provider account/template details are supplied.
- Runtime observability still needs a real aggregation/export target, retention policy, alert rules, and dashboard setup.
- Production TLS certificate files in `nginx/ssl` are local placeholders until real certificates are supplied.
- Nginx still needs the real production `server_name`, real certificate/key files, certificate renewal automation, and staging verification.
- Redis password rotation and secret injection need to be handled by the target deployment platform, not committed to the repository.
- Local `.env` currently needs a non-empty `REDIS_PASSWORD`; otherwise `docker compose config` fails by design.
- Docker image build verification is blocked on this machine until Docker Desktop Linux Engine is running.

## Verification Commands

Run after Phase 2 changes:

```powershell
npm run test:node
powershell -ExecutionPolicy Bypass -File scripts/quality-check.ps1
docker compose config
docker compose build
```

Current verification evidence:

- `npm run test:node`: passed, 37/37 Node tests.
- `node --check backend/microservices/gateway/index.js`: passed.
- `node --check backend/microservices/shared/logger.js` and `gateway/rate-limit.js`: passed.
- `node --check backend/microservices/auth-service/sms-provider.js` and `auth.service.js`: passed.
- `node --check backend/microservices/product-service/services/product.service.js`, `order.service.js`, and `user.service.js`: passed.
- `powershell -ExecutionPolicy Bypass -File scripts/quality-check.ps1`: passed with `REDIS_PASSWORD` supplied as a temporary shell environment variable; frontend lint still reports 54 warnings and 0 errors.
- `docker compose config`: passed with `REDIS_PASSWORD` supplied as a temporary shell environment variable.
- `docker compose build nginx`: passed as no-op because nginx uses the official image and has no local build context.
- `docker compose build auth-service`, `docker compose build gateway`, and `docker compose build product-service order-service user-service`: blocked because Docker Desktop Linux Engine was not reachable on this machine.

## Rollout Notes

Do not enable production traffic until secrets, TLS, rate limiting, SMS, storage, and observability are verified in a staging environment.
