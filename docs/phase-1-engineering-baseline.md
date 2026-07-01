# Phase 1 Engineering Baseline

This phase turns the project from a buildable demo into a safer, repeatable delivery baseline. It intentionally avoids payment, SMS vendor, app-store, and production certificate integrations until those accounts are available.

## Mainline Decisions

- `frontend` is the active React Native Android app.
- `mobile` is treated as a historical or experimental app until explicitly reactivated.
- `backend/microservices` is the active backend runtime.
- `backend/src` is historical reference code until explicitly reactivated.

## Required Local Configuration

- Copy `.env.example` to `.env` and fill in `DB_PASSWORD`, `JWT_SECRET`, and `REDIS_PASSWORD`.
- Copy `frontend/android/keystore.properties.example` to `frontend/android/keystore.properties` only when a real release keystore is available.
- Keep `.env`, `frontend/android/keystore.properties`, `*.jks`, and `*.keystore` out of git.

## User-Provided Items Needed Later

- Real Android release keystore and passwords.
- Production API domain and HTTPS certificate.
- SMS provider credentials.
- WeChat or QQ login credentials if third-party login is required.
- WeChat Pay or Alipay merchant credentials if real payment is required.
- Crash reporting project key, such as Bugly or Sentry.
- Xiaomi app store developer account and compliance materials.

## Quality Commands

Run the baseline check from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/quality-check.ps1
```

GitHub Actions runs the same baseline intent in `.github/workflows/ci.yml`: backend node tests, frontend lint, Android JS bundle generation, Docker Compose config validation, and Docker image build smoke checks.

Run the Android release build only after configuring a real keystore:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/quality-check.ps1 -AndroidRelease
```

## Release Safety

Release builds must not silently use the debug keystore. If `frontend/android/keystore.properties` is missing or incomplete, `assembleRelease` fails with a clear signing configuration error.

## Open Issues Annotated

Track unresolved work here before moving between implementation batches. Phase 2 and Phase 3 should use the same pattern: completed work, unresolved issues, required external configuration, and verification evidence.

### Phase 1 Remaining

- Frontend lint currently passes with warnings. The remaining warnings are mostly unused variables, hook dependency warnings, `alert` usage, and JSX quote style. They are non-blocking for the baseline but should be cleaned before tightening lint to zero warnings.
- `AddressScreen` had corrupted generated province/city constants. The duplicate-key syntax risk was removed and the form remains usable with manual address fields. A verified region dataset and selector should be added later.
- Android release builds require a real `frontend/android/keystore.properties`; without it, release build failure is intentional.
- Frontend dependency audit reports high-severity issues in the React Native 0.73 CLI dependency chain. `npm audit fix --force` would upgrade React Native to a breaking major path, so this needs a separate React Native upgrade task.
- Backend package audits report moderate vulnerabilities across service dependency trees. These should be handled in a dedicated dependency-maintenance pass after the baseline is stable.
- Full Jest/supertest backend tests remain available as `npm run test:jest`, but the baseline quality script currently runs the deterministic Node test subset with `npm run test:node`.
- CI does not deploy. The old deploy job was intentionally removed from the baseline workflow because GitHub-hosted runners are not the production host and must not run `docker compose down/up` against a live environment.
- CI does not build Android release APKs until a secure keystore secret strategy is added.

### Phase 2 Recording Rule

When Phase 2 starts, add a `docs/phase-2-runtime-security.md` file and keep these sections current: completed changes, open issues, required provider credentials, verification commands, and rollout notes.

### Phase 3 Recording Rule

When Phase 3 starts, add a `docs/phase-3-business-closure.md` file and keep these sections current: completed changes, open issues, required merchant/app-store credentials, verification commands, and rollout notes.
