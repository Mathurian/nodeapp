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
8. Working tree is currently clean.

## Public API / Interface / Type Changes
1. Add `VITE_OFFLINE_MUTATION_QUEUE_ENABLED?: string` to `frontend/src/vite-env.d.ts`.
2. Add Prisma model for idempotency persistence:
   - `IdempotencyRecord` with `key`, `tenantId`, `method`, `path`, `status` (`pending` | `completed`), `statusCode`, `responseBody`, `digest`, `expiresAt`, `createdAt`, `lastSeenAt`
   - unique index: `(tenantId, method, path, key)`
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

## Phase 1: Restore Green Build and Typing
1. Update `frontend/src/vite-env.d.ts` to declare `VITE_OFFLINE_MUTATION_QUEUE_ENABLED`.
2. Fix queue typing mismatch:
   - make `enqueueMutation` input omit `lastError`
   - default stored `lastError` to `null` inside queue write path
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
   - If record status is `completed` and unexpired, return cached response.
   - Before controller side effects, attempt an atomic DB reservation (`pending`) for `(tenantId, method, path, key)`.
   - If reservation already exists as `pending`, return deterministic retry guidance (or bounded wait/poll behavior) without executing side effects.
   - On first successful 2xx write, transition DB record `pending -> completed`, persist response, then cache Redis.
   - On non-2xx terminal result, clear or mark reservation according to retryability policy.
   - On Redis miss + DB hit, repopulate Redis.
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

## Phase 3: Timeout Semantics End-to-End
1. Wire query timeout middleware into active Prisma setup in `src/config/database.ts`.
2. Ensure middleware registration order remains deterministic with soft-delete/query monitoring.
3. Emit explicit timeout/transient error metadata from middleware, not message-only inference.
4. Enforce response mapping in `errorHandler`:
   - timeout-like -> 504 + `QUERY_TIMEOUT`
   - transient upstream-like -> 503 + `TRANSIENT_UPSTREAM_FAILURE`

## Phase 4: Dual Queue Guardrails (App Queue + Workbox Sync)
1. Keep both queues but define responsibilities:
   - app queue = primary for scoring/commentary JSON mutations
   - Workbox queue = safety net and score-file write coverage
2. For overlap paths:
   - require idempotency key on all writes
   - preserve key through replay paths
3. Confirm Workbox runtime rules:
   - write endpoints remain `NetworkOnly`
   - mutation responses are not cached as read data
   - method coverage matrix is explicit and tested:
     - `POST`: scoring, commentary, score-files write endpoints
     - `PUT`: scoring, commentary, score-files write endpoints
     - `PATCH`: scoring, commentary, score-files write endpoints (or documented intentional exclusions)
     - `DELETE`: scoring, commentary, score-files write endpoints (or documented intentional exclusions)
4. Add poison-message handling:
   - app queue permanent failure threshold with user-visible failed state
   - SW failures surfaced via telemetry/logging
5. Document queue interaction model:
   - app queue drives UI state
   - SW queue is fallback transport
   - backend idempotency is final dedupe authority

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
3. Frontend service tests:
   - enqueue on retryable timeout/network failure
   - replay on reconnect/foreground
   - retry cap and permanent failure path
   - ordering guarantees for same entity stream
   - Workbox method coverage parity checks for configured write endpoints (`POST`/`PUT`/`PATCH`/`DELETE` or documented exclusions)
4. E2E/manual scenario verification:
   - online save
   - forced timeout and retry
   - offline enqueue
   - reconnect sync
   - duplicate prevention
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
3. Duplicate replay is blocked across restarts and replicas.
4. Timeout/transient responses are stable and machine-classifiable.
5. Queue interaction model is documented and observable in ops dashboards.
6. Reliability test gates pass before release.

## Assumptions and Defaults
1. Idempotency retention defaults to 24 hours.
2. DB is authoritative; Redis is acceleration.
3. Dual queue remains in place with strict guardrails and dedupe.
4. Telemetry stores operational metadata only, not sensitive mutation payloads.
5. Rollout is staged and feature-flagged before broad production enablement.
6. TTL invariants are enforced:
   - Redis replay entry TTL must never exceed DB `expiresAt`.
   - App queue retry horizon and Workbox retention must not exceed server idempotency retention unless fallback behavior is explicitly documented.
