# Close-the-Gaps Implementation Plan (Offline Reliability + Idempotency)

## Summary
This plan implements the checklist in `docs/operations/internal/close-the-gaps-checklist.md` using:
- Durable idempotency: hybrid DB + Redis
- Replay model: dual queue with guardrails (app IndexedDB queue + Workbox Background Sync)
- Central observability: backend ingest endpoint for client sync telemetry

Execution order is: restore green build, harden correctness and dedupe, then complete observability, docs, and rollout gates.

## Current Baseline
1. Backend build passes.
2. Frontend build fails on `enqueueMutation` typing (`lastError` missing).
3. `VITE_OFFLINE_MUTATION_QUEUE_ENABLED` is used in code but missing in frontend env typings.
4. Backend idempotency currently uses in-memory `Map` and is not durable/cross-instance safe.
5. Timeout code mapping exists in `errorHandler`, but query-timeout middleware is not wired into active Prisma path.
6. Offline queue/orchestrator has implementation but limited dedicated automated coverage.
7. Workbox write Background Sync and app queue both exist, requiring explicit coordination.

## Cross-Cutting Guardrails and Compatibility Requirements
1. Backward-compatible idempotency rollout:
   - `x-idempotency-key` moves to required-for-writes via staged enforcement.
   - migration phases: observe-only -> soft-fail diagnostics -> allowlisted hard-fail.
   - legacy clients/integrations without key must have an explicit compatibility path and deprecation timeline.
2. Canonical error payload contract (no message parsing):
   - timeout/transient responses include stable fields (e.g. `code`, `retryable`, `classification`, `requestId`).
   - frontend retry classifier and queueing logic consume these fields as the source of truth.
3. TTL alignment is enforceable, not advisory:
   - startup/runtime checks ensure app queue retry horizon and Workbox retention do not exceed server idempotency TTL unless documented fallback semantics are enabled.
   - define behavior when client replay arrives after server TTL expiry (e.g., reject with deterministic non-retryable code + user-visible conflict handling).
4. Prisma timeout middleware must be consistently registered:
   - apply across all Prisma client construction paths (global singleton, request-scoped tenant clients, container-resolved clients, read/replica variants).
5. Telemetry ingestion must be operationally safe:
   - telemetry failures never block primary write flows.
   - auth/session-expiry behavior for offline replay is defined (retry window, refresh attempt, graceful drop policy with counters).
   - retention policy, redaction/allowlist enforcement point, and high-cardinality protections are explicitly documented.

## Public API / Interface / Type Changes
1. Add `VITE_OFFLINE_MUTATION_QUEUE_ENABLED?: string` to `frontend/src/vite-env.d.ts`.
2. Add Prisma model for idempotency persistence:
   - `IdempotencyRecord` with `key`, `tenantId`, `actorType`, `actorId`, `method`, `path`, `requestHash`, `status` (`pending` | `completed` | `failed_retryable` | `failed_terminal`), `statusCode`, `responseBody`, `digest`, `expiresAt`, `createdAt`, `updatedAt`, `lastSeenAt`
   - unique index: `(tenantId, actorType, actorId, method, path, key)`
3. Add backend idempotency storage abstraction:
   - `IdempotencyStore` interface, DB source-of-truth with Redis accelerator.
4. Keep/extend idempotency headers:
   - `X-Idempotent-Replay`, `X-Idempotency-Digest`
   - optional debug header: `X-Idempotency-Store` (`db`, `redis`, `db+redis`) in non-prod diagnostics only.
5. Add telemetry endpoint:
   - `POST /api/v1/telemetry/offline-sync` (authenticated, tenant-scoped, rate-limited).
   - versioned payload contract with bounded-cardinality fields and request-size guardrails.
6. Add queue-source contract for overlap diagnostics:
   - `X-Queue-Source: app` for app replays
   - classify SW-origin writes as `sw` for telemetry when possible.
7. Standardize retry-classification server contract:
   - `QUERY_TIMEOUT` -> 504
   - `TRANSIENT_UPSTREAM_FAILURE` -> 503
8. Add deterministic idempotency conflict/mismatch codes:
   - `IDEMPOTENCY_REQUEST_IN_PROGRESS` -> 409 + `Retry-After`
   - `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` -> 409
9. Add deterministic auth-expiry replay code:
   - `IDEMPOTENCY_AUTH_EXPIRED_RETRYABLE` -> 401 + `Retry-After` (replay remains retryable after re-auth).

## Phase 1: Restore Green Build and Typing
1. Update `frontend/src/vite-env.d.ts` to declare `VITE_OFFLINE_MUTATION_QUEUE_ENABLED`.
2. Fix queue typing mismatch:
   - make `enqueueMutation` input omit `lastError`
   - default stored `lastError` to `null` inside queue write path
   - use an explicit enqueue input type to prevent accidental reintroduction of required internal fields
3. Validation:
   - `npm run build`
   - `cd frontend && npm run build`

## Phase 2: Durable Idempotency (Hybrid DB + Redis)
1. Add Prisma schema + migration for `IdempotencyRecord`.
2. Implement backend store components:
   - DB repository for canonical persistence and replay lookup
   - Redis accessor for fast cache hit path with matching TTL
3. Refactor `src/middleware/idempotency.ts` to use store abstraction.
4. Request flow:
   - On key present, read Redis, fallback DB.
   - On record hit, always validate `requestHash` equality first; mismatch returns `409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`.
   - If record status is `completed` or `failed_terminal` and unexpired, replay stored response.
   - Before controller side effects, attempt atomic DB reservation (`pending`) for `(tenantId, actorType, actorId, method, path, key)`.
   - If reservation already exists as fresh `pending`/`failed_retryable`, return `409 IDEMPOTENCY_REQUEST_IN_PROGRESS` with `Retry-After: 1` (no side effects).
   - If existing `pending` is stale (`updatedAt` older than `IDEMPOTENCY_PENDING_STALE_MS`, default 30000), atomically reclaim reservation via compare-and-set and continue.
   - On first successful 2xx, transition `pending -> completed`, persist replay payload, then cache Redis.
   - On deterministic client error (400/404/409/422), transition to `failed_terminal`, persist replay payload.
   - On auth/session-expiry errors (401 and retryable 403 cases such as CSRF/session refresh), transition to `failed_retryable` and return `IDEMPOTENCY_AUTH_EXPIRED_RETRYABLE`; do not pin terminal outcome.
   - On authorization-denied errors (non-retryable 403 such as `ACCESS_DENIED`/`AUTHORIZATION_ERROR`), transition to `failed_terminal`.
   - On transient/unknown failure (429/5xx/timeout/network abort), transition to `failed_retryable` with short expiry/heartbeat, no replay payload commitment.
   - On Redis miss + DB hit, repopulate Redis.
   - Crash-window semantics are explicit and mandatory:
     - for DB-backed mutations on covered routes, perform idempotency completion write in the same DB transaction as business side effects.
     - if transaction-bound completion write fails, entire transaction rolls back (no committed side effect without idempotency state).
     - for non-transactional/external side effects, write `pending` reservation first, execute side effect, then on duplicate hit run a reconciliation probe (deterministic lookup by mutation fingerprint) before reclaiming stale reservation.
     - reconciliation probe result:
       - found side effect => transition to `completed` and replay.
       - not found and stale timeout exceeded => reclaim reservation and execute once.
   - Replay payload persistence guardrails:
     - redact denylisted fields: `password`, `access_token`, `refresh_token`, `signature`, `secret`
     - enforce max serialized replay payload size (`IDEMPOTENCY_MAX_RESPONSE_BYTES`, default 65536)
     - if over limit after redaction, store minimal replay envelope (status/code/message/digest) and mark replay mode as metadata-only
5. TTL:
   - 24h default
   - env-configurable with min/max guardrails
6. Expired record cleanup:
   - scheduled cleanup task for DB rows by `expiresAt`
7. Multi-instance safety:
   - DB uniqueness is the dedupe authority.
   - Redis is acceleration only, never the only source.
8. Concurrency and recovery tests:
   - same idempotency key submitted concurrently across processes executes side effects at most once.
   - stale `pending` reservations are reclaimed by timeout/cleanup policy.
   - side-effect-committed/completion-write-failed cases are reconciled without duplicate side effects.
   - same idempotency key with different payload returns `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` and does not execute side effects.
   - auth-expiry replay does not become terminal; after successful re-auth the same key can complete exactly once.

## Phase 3: Timeout Semantics End-to-End
1. Wire query timeout middleware into active Prisma setup in `src/config/database.ts`.
2. Ensure middleware registration order remains deterministic with soft-delete/query monitoring.
3. Replace app-layer timeout race for mutating DB operations with real DB-side cancellation semantics:
   - apply transaction-scoped `SET LOCAL statement_timeout` for covered write paths and explicitly enumerated heavy-read paths
   - ensure timeout actually aborts SQL execution before side effects complete
4. Keep middleware timer as observability signal only (slow-query logging), not the authoritative cancellation mechanism for writes.
5. Emit explicit timeout/transient error metadata from middleware/service layer, not message-only inference.
6. Enforce response mapping in `errorHandler`:
   - timeout-like -> 504 + `QUERY_TIMEOUT`
   - transient upstream-like -> 503 + `TRANSIENT_UPSTREAM_FAILURE`
7. Add regression guard: timeout response must imply DB write cancellation for covered mutation paths.
8. Extend timeout middleware wiring/verification to all Prisma construction paths (request-scoped, container-resolved, replica/read variants).
9. Canonical error payload fields are versioned and contract-tested end-to-end.
10. Covered timeout-enforced route set (explicit):
   - scoring writes: `POST /api/v1/scoring/category/:categoryId/contestant/:contestantId`, `PUT /api/v1/scoring/:scoreId`
   - commentary writes: `POST /api/v1/commentary`, `POST /api/v1/commentary/scores`, `PUT /api/v1/commentary/:id`
   - score-file writes: `POST /api/v1/score-files`, `PUT|PATCH|DELETE /api/v1/score-files/:id` where implemented
   - all covered routes must execute Prisma writes via a shared `withMutationTimeoutTx` helper that sets `SET LOCAL statement_timeout` before write operations.

## Phase 4: Dual Queue Guardrails (App Queue + Workbox Sync)
1. Keep both queues but define responsibilities:
   - app queue = only queue for scoring/commentary JSON mutations
   - Workbox queue = only queue for score-file uploads/updates where browser SW retry is preferred
2. Queue precedence is deterministic:
   - if endpoint belongs to app-queue domain, Workbox must not enqueue it
   - if endpoint belongs to Workbox domain, app queue must not enqueue it
   - `X-Queue-Source` header is retained for diagnostics/telemetry attribution
3. For all queued write paths:
   - require idempotency key on every mutation (phased enforcement per compatibility plan where needed)
   - preserve key through replay paths unchanged
4. Confirm Workbox runtime rules:
   - write endpoints remain `NetworkOnly`
   - mutation responses are not cached as read data
   - method coverage matrix is explicit and tested:
     - app queue routes: scoring/commentary `POST`/`PUT` (documented exclusions for `PATCH`/`DELETE` if not used)
     - Workbox routes: score-files `POST`/`PUT` (documented exclusions for `PATCH`/`DELETE` if not used)
5. Add poison-message handling:
   - app queue permanent failure threshold with user-visible failed state
   - SW failures surfaced via telemetry/logging
6. Document queue interaction model:
   - app queue drives UI state
   - SW queue is separate domain transport, not overlapping fallback for app queue routes
   - backend idempotency is final dedupe authority
7. Frontend mutation API parity:
   - reliability wrappers and queue contracts explicitly support configured write methods (`POST`/`PUT`/`PATCH`/`DELETE`) or document intentional exclusions.
   - current `'POST' | 'PUT'` only surfaces are expanded or gated with documented rationale before rollout.

## Phase 5: User Messaging Consistency
1. Enforce exact state messaging contract across scoring/commentary flows:
   - Saving
   - Retrying (network unstable)
   - Saved offline / queued
   - Syncing queued updates
   - Synced
   - Sync failed (actionable retry)
2. Ensure rollback only occurs on definitive non-retryable failure.
3. Update `frontend/public/offline.html` copy to match actual guarantees and limitations.

## Phase 6: Operational Readiness, Telemetry, and Rollout Controls
1. Implement telemetry ingest endpoint for client offline-sync metrics.
   - Require `schemaVersion` and validate payload against versioned contract.
   - Enforce allowlist-only fields (no raw mutation payloads or PII).
   - Apply request body size limits and bounded enum/label values to avoid high-cardinality metrics.
   - Add sampling/backpressure handling when ingest volume spikes.
   - Define auth/session-expiry behavior during offline flush (refresh/retry/degrade/drop semantics).
   - Ensure telemetry ingest failures are non-blocking for scoring/commentary writes.
   - Define retention windows and field-level redaction enforcement point.
   - Fixed metric label schema (no tenant/user/request IDs in labels):
     - `queue_source`: `app|sw`
     - `operation`: `submit_score|update_score|create_comment|update_comment|upload_score_file`
     - `result`: `enqueued|replay_success|replay_retry|replay_permanent_failure|dropped`
     - `network_state`: `online|offline|unknown`
     - `status_bucket`: `2xx|4xx|429|5xx|timeout|network_error`
   - Tenant/user correlation remains in logs/event storage only, not Prometheus label cardinality.
2. Add Prometheus metrics:
   - queue depth
   - replay success/failure
   - permanent failure count
   - sync delay buckets
   - idempotent replay hit rate
3. Add Grafana dashboards and alerts:
   - sustained queue depth growth
   - replay failure spikes
   - permanent failures > threshold
   - p95 sync delay over threshold
4. Feature flag rollout:
   - keep queue feature gated
   - staged enablement by environment/tenant allowlist
5. Rollback procedure:
   - disable queue feature flag safely
   - retain online-write behavior
   - preserve idempotency protections

## Phase 7: Test and Verification Gates
1. Backend unit tests:
   - idempotency replay hit/miss and TTL behavior
   - timeout/transient mapping contract assertions
2. Backend integration tests:
   - replay behavior across restart simulation
   - replay behavior across multi-instance simulation
   - pending-reservation crash-window reconciliation behavior
3. Frontend service tests:
   - enqueue on retryable timeout/network failure
   - replay on reconnect/foreground
   - retry cap and permanent failure path
   - ordering guarantees for same entity stream
   - Workbox method coverage parity checks for configured write endpoints (`POST`/`PUT`/`PATCH`/`DELETE` or documented exclusions)
   - TTL mismatch behavior when client replay exceeds server idempotency retention
4. E2E/manual scenario verification:
   - online save
   - forced timeout and retry
   - offline enqueue
   - reconnect sync
   - duplicate prevention
   - telemetry flush with expired auth/session and expected degrade behavior
5. Final gate commands:
   - `git status --short`
   - `npm run build`
   - `cd frontend && npm run build`
   - targeted reliability/offline test suites

## File-Level Deliverables
1. Frontend:
   - `frontend/src/vite-env.d.ts`
   - `frontend/src/services/offlineMutationQueue.ts`
   - `frontend/src/services/offlineSyncOrchestrator.ts`
   - `frontend/src/pages/ScoringPage.tsx`
   - `frontend/vite.config.ts`
   - `frontend/public/offline.html`
2. Backend:
   - `src/middleware/idempotency.ts`
   - `src/config/database.ts`
   - `src/config/queryTimeouts.ts`
   - `src/middleware/errorHandler.ts`
   - telemetry route/controller/service files
   - `src/services/MetricsService.ts`
3. Data model:
   - `prisma/schema.prisma`
   - idempotency migration files
4. Tests:
   - backend unit/integration additions for idempotency and timeout
   - frontend tests for queue/orchestrator/retry behavior
5. Documentation:
   - update checklist status
   - add rollout and rollback runbook details
   - update ADR for final dual-queue interaction model
   - document telemetry schema versioning + cardinality constraints
   - document idempotency reservation (`pending`) semantics and recovery behavior

## Acceptance Criteria
1. Backend and frontend builds pass.
2. No silent score/comment mutation loss during timeout/offline/reconnect.
3. Duplicate replay is blocked across restarts and replicas, including concurrent duplicate submissions.
4. Timeout/transient responses are stable and machine-classifiable, and mutation timeouts must abort DB execution (no post-timeout side effects).
5. Queue interaction model is documented and observable in ops dashboards.
6. Reliability test gates pass before release.
7. Quantitative release gates are defined and met:
   - replay success-rate >= 99.5% over rolling 15 minutes (per environment)
   - duplicate-write incidents = 0 confirmed incidents in rolling 24 hours
   - sync-delay SLOs: p95 <= 60s and p99 <= 180s over rolling 30 minutes
   - sustained queue depth bounds: global queued count <= 2000 and per-tenant p95 <= 50 over rolling 15 minutes
   - telemetry drop-rate < 1.0% over rolling 15 minutes
8. Rollback trigger thresholds are defined and tied to alert conditions:
   - replay success-rate < 98.5% for 15 continuous minutes
   - any confirmed duplicate-write incident in production
   - sync delay breaches: p95 > 180s for 30 continuous minutes
   - sustained queue-depth breach: global queued count > 5000 for 15 continuous minutes
   - telemetry drop-rate >= 5% for 15 continuous minutes

## Assumptions and Defaults
1. Idempotency retention defaults to 24 hours.
2. DB is authoritative; Redis is acceleration.
3. Dual queue remains in place with strict guardrails and dedupe.
4. Telemetry stores operational metadata only, not sensitive mutation payloads.
5. Rollout is staged and feature-flagged before broad production enablement.
6. TTL invariants are enforced:
   - Redis replay entry TTL must never exceed DB `expiresAt`.
   - App queue retry horizon and Workbox retention must not exceed server idempotency retention unless fallback behavior is explicitly documented.
