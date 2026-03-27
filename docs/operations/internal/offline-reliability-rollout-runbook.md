# Offline Reliability Rollout Runbook

## Scope
This runbook covers the scoring/commentary offline reliability rollout implemented by the close-the-gaps plan:

- durable idempotency with DB authority and Redis acceleration
- app-owned offline queue for scoring/commentary JSON mutations
- Workbox-owned background sync for score-file upload/update mutations
- backend telemetry ingest for offline replay outcomes
- manifest-driven route ownership, timeout coverage, and idempotency enforcement

## Components
1. Backend durable idempotency:
   - Prisma model: `IdempotencyRecord`
   - Store abstraction: DB is source of truth, Redis is cache only
   - Middleware: `src/middleware/idempotency.ts`
2. Client replay:
   - App queue: `frontend/src/services/offlineMutationQueue.ts`
   - Replay orchestrator: `frontend/src/services/offlineSyncOrchestrator.ts`
   - Telemetry buffer/flush: `frontend/src/services/offlineSyncTelemetry.ts`
3. Ownership manifest:
   - Source: `config/offline-write-ownership.manifest.json`
   - Generated projections: `src/generated/offlineWriteOwnership.manifest.ts`, `frontend/src/config/offlineWriteOwnership.manifest.ts`
4. Manifest trust:
   - Verification: `src/security/manifestSignature.ts`
   - Trust store: `src/config/manifestTrustStore.ts`
   - Local signing helper: `scripts/build/sign-offline-write-ownership-manifest.js`
5. Timeout semantics:
   - Query middleware: `src/config/queryTimeouts.ts`
   - DB timeout helper: `src/utils/dbMutationTimeout.ts`

## Queue Ownership Contract
1. App queue owns:
   - `POST /scoring/category/:categoryId/contestant/:contestantId`
   - `PUT /scoring/:scoreId`
   - `DELETE /scoring/:scoreId`
   - `POST /commentary`
   - `POST /commentary/scores`
   - `PUT /commentary/:id`
   - `DELETE /commentary/:id`
2. Workbox owns:
   - `POST /score-files`
   - `PATCH /score-files/:id`
3. Neither queue owns:
   - `DELETE /score-files/:id`
   - Any route not declared in the manifest

## Build And Release Steps
1. Generate manifest projections:
   - `npm run build:offline-write-ownership`
2. Local/dev signing only:
   - `npm run sign:offline-write-ownership`
3. Backend build:
   - `npm run build`
4. Frontend build:
   - `cd frontend && npm run build`
5. Trusted-boundary signing:
   - `scripts/ci/sign-manifest-with-kms.sh`

## Idempotency Enforcement Phases
1. Observe-only
   - canonical path is computed, diagnostics are emitted, legacy path scope remains authoritative
2. Soft-fail diagnostics
   - missing/invalid keys are measured and surfaced without hard production cutoff
3. Allowlisted hard-fail
   - covered write routes in the manifest enforce required keys
4. Global hard-fail
   - all covered writes enforce the contract

## Promotion Gates
1. Minimum soak:
   - staging: 7 days
   - production: 14 days
2. Thresholds:
   - missing-key rate on covered writes `< 0.5%` over rolling 24h
   - no p95 write latency regression `> 10%`
   - no write error-rate regression `> 0.2pp`
   - client compatibility `>= 99%` of write traffic
   - shadow canonical divergence `<= 0.1%` for 72 continuous hours before canonical enforcement
3. Required approvals:
   - API owner
   - SRE owner
   - product owner

## Startup Health Gates
Startup must evaluate:
1. Manifest validity and signature verification
2. Anti-rollback state
3. TTL invariants:
   - app queue retention <= server idempotency TTL unless fallback is explicitly enabled
   - Workbox retention <= server TTL unless fallback is explicitly enabled
   - Redis TTL <= DB expiry

`/health` is degraded when manifest integrity or offline reliability invariants are invalid.

## Pending Reservation Semantics
1. `pending`
   - reservation exists, no replay payload committed
   - lease heartbeat is refreshed while work is active
2. `completed`
   - replayable, deterministic response stored
3. `failed_retryable`
   - safe to retry after backoff or re-auth
4. `failed_terminal`
   - no retry without user change or new key

Stale `pending` reservations are reclaimable only after lease expiry and reconciliation rules are applied.

## Auth Expiry Replay Contract
1. Retryable auth/session expiry returns:
   - `401 IDEMPOTENCY_AUTH_EXPIRED_RETRYABLE`
   - `Retry-After`
2. Frontend behavior:
   - do not force logout on this code
   - re-auth may occur
   - same idempotency key may complete later exactly once

## Offline Queue Security Posture
1. Queue persists only app-owned mutations
2. Queue rejects restricted field names:
   - `password`
   - `token`
   - `access_token`
   - `refresh_token`
   - `secret`
   - `signature`
   - `authorization`
   - `cookie`
3. Persisted queue entries are classified as `internal`
4. Purge triggers:
   - logout
   - authenticated user change
   - tenant change
   - max-age expiry

## Telemetry Contract
1. Endpoint:
   - `POST /api/v1/telemetry/offline-sync`
2. Required fields:
   - `schemaVersion`
   - `events[]`
   - per-event `eventId`, `clientTimestamp`, `operation`, `result`, `queue_source`, `network_state`, `status_bucket`
3. Default bounds:
   - freshness window: `300000ms`
   - dedupe window: `86400000ms`
   - max client batch size: `100`
4. Cardinality rules:
   - labels must not include tenant ID, user ID, request ID, or free-form strings
5. Abuse controls:
   - authenticated only
   - tenant-scoped dedupe
   - quota enforcement
   - freshness validation
   - bounded client buffer and event age

## Manifest Incident Response
1. Strict mode:
   - startup fails
   - do not serve covered write traffic
2. Non-strict mode:
   - covered manifest-owned write routes remain disabled
   - unrelated read traffic stays available
   - emit critical alert
3. Recovery target:
   - restore valid signed manifest within 15 minutes
4. Recovery sequence:
   - regenerate manifest projections
   - sign manifest in trusted boundary
   - verify trust-store/key state
   - restart application
   - confirm `/health` manifest state is valid

## Canonical Path Shadow Rollout
1. Backfill `canonicalPath` for all legacy `IdempotencyRecord` rows using the shared route canonicalizer
2. Run uniqueness audit on:
   - `(tenantId, actorType, actorId, method, canonicalPath, key)`
3. Resolve collisions using deterministic precedence before contract migration
4. Enable shadow mode:
   - `IDEMPOTENCY_CANONICAL_ENFORCE=false`
5. Promote only after divergence gate is met
6. Keep rollback toggle available to restore legacy path scope

## Replay Payload Governance
1. Metadata-only persistence is the default posture
2. Allowlisted payload persistence requires replay payload encryption
3. Required controls:
   - redaction denylist
   - size cap
   - key version tagging
   - retention expiry
   - erasure/offboarding handling
   - legal hold exception process

## Key Custody Policy
1. Development/test:
   - `env` and `local` providers are acceptable only when insecure providers are explicitly allowed
2. Production-grade target:
   - `aws` or `vault`
   - non-exportable keys
   - trusted runtime or CI identity only
3. Current repo posture:
   - provider abstraction is implemented
   - `env` and `local` are functional for dev/test
   - production provider binding remains a deployment decision

## Storage Maintenance Policy
1. Monitor:
   - idempotency row growth
   - cleanup lag
   - index bloat
   - lock contention
   - telemetry dedupe saturation
2. Maintenance expectations:
   - scheduled cleanup of expired idempotency rows
   - partition/archive strategy before high-volume rollout
   - vacuum/analyze cadence for high-churn tables

## Rollback
1. Disable queue feature flag if client replay behavior regresses
2. Leave online writes active
3. Preserve backend idempotency protections
4. If migration contract phase is already applied:
   - use pre-contract backup for rollback, or
   - apply forward-fix playbook

## Verification Commands
1. `npm run build`
2. `cd frontend && npm run build`
3. Targeted Jest suites:
   - `tests/unit/middleware/idempotency.test.ts`
   - `tests/unit/config/offlineWriteOwnership.config.test.ts`
   - `tests/unit/config/offlineReliability.config.test.ts`
   - `tests/unit/security/managedCryptoProvider.test.ts`
   - `tests/unit/services/OfflineSyncTelemetryService.test.ts`
   - `tests/unit/utils/idempotencyCanonicalizers.test.ts`
