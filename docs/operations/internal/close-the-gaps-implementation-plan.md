# Close-the-Gaps Implementation Plan (Offline Reliability + Idempotency)

## Summary
This plan implements the checklist in `docs/operations/internal/close-the-gaps-checklist.md` using:
- Durable idempotency: hybrid DB + Redis
- Replay model: dual queue with guardrails (app IndexedDB queue + Workbox Background Sync)
- Central observability: backend ingest endpoint for client sync telemetry

Execution order is: restore green build, harden correctness and dedupe, then complete observability, docs, and rollout gates.

## Current Baseline
1. Backend build passes.
2. Frontend build status must be re-validated at execution start; prior snapshot flagged an `enqueueMutation` typing mismatch (`lastError` missing).
3. `VITE_OFFLINE_MUTATION_QUEUE_ENABLED` usage and frontend env typings must be verified for parity at execution start.
4. Backend idempotency currently uses in-memory `Map` and is not durable/cross-instance safe.
5. Timeout code mapping exists in `errorHandler`, but query-timeout middleware is not wired into active Prisma path.
6. Offline queue/orchestrator has implementation but limited dedicated automated coverage.
7. Workbox write Background Sync and app queue both exist, requiring explicit coordination.

## Cross-Cutting Guardrails and Compatibility Requirements
1. Backward-compatible idempotency rollout:
   - `x-idempotency-key` moves to required-for-writes via staged enforcement.
   - migration phases: observe-only -> soft-fail diagnostics -> allowlisted hard-fail -> global hard-fail.
   - publish a route+method enforcement matrix per phase, including explicit exemptions, expiry dates, and rollback toggle behavior.
   - each phase must define default server behavior for missing key per route+method (`status`, `code`, retryability, and fallback path) so enforcement is uniform across teams.
   - legacy clients/integrations without key must have an explicit compatibility path and deprecation timeline.
   - phase advancement is objective and gated:
     - minimum soak duration per phase/environment: 7 days in staging, 14 days in production.
     - missing-key request rate on covered write paths must be < 0.5% (rolling 24h) before promotion.
     - no p95 write-latency regression > 10% and no write-error-rate regression > 0.2 percentage points versus pre-phase baseline (rolling 24h).
     - client compatibility coverage for the next phase must be >= 99% of write traffic by version/integration.
     - all rollback/alert thresholds must remain green for 72 continuous hours before promotion.
   - phase transitions require explicit owner approval (API + SRE + product owner), recorded in rollout runbook changelog.
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
   - auth-expiry behavior is deterministic: bounded refresh attempts, retry schedule with attempt cap, deterministic drop reasons/counters, and circuit-breaker protection against retry storms.
6. Browser/API compatibility requirements are explicit:
   - CORS allowlist includes request headers used by replay/idempotency (`x-idempotency-key`, `x-queue-source`) and any rollout diagnostics headers.
   - CORS exposed headers include replay diagnostics used by frontend (`X-Idempotent-Replay`, `X-Idempotency-Digest`, migration aliases where applicable).
   - CORS exposed headers include retry controls consumed by browser replay/backoff logic (`Retry-After` for 401/409/429 retryable responses).
7. API governance is mandatory for staged rollout:
   - OpenAPI/reference docs are updated for new headers, error codes, and phase behavior before phase advancement.
   - client compatibility matrix (by client version/integration) gates progression from soft-fail to hard-fail phases.
   - migration payload examples must include both canonical and legacy alias fields during compatibility windows, with explicit alias removal dates.
8. Idempotency key abuse resistance is mandatory:
   - enforce strict `x-idempotency-key` validation (allowed charset, min/max length, transport decoding) with deterministic invalid-key error code.
   - validation is parse/accept-reject only: do not apply semantic normalization (no trim/case-fold/rewrite) after decode, so key identity remains byte-stable.
   - publish client-generation guidance (UUIDv4 or equivalent high-entropy keys) and prohibit low-entropy/reused keys.
   - apply per-tenant/per-actor request and in-flight pending-reservation limits to prevent storage exhaustion and hot-partition abuse.
   - require safe logging policy (never log raw idempotency keys in plaintext; use hashed/truncated forms for diagnostics).
   - canonical route identity for idempotency scope is explicitly normalized before lookup/reservation (method casing, path trailing-slash policy, decode/encode handling, and version/alias handling) to prevent path-variant dedupe bypass.
9. Offline queue client storage must follow data-minimization and security controls:
   - queued payloads store only required mutation fields; tokens/secrets are prohibited.
   - queue purge triggers are explicit (logout/session switch/tenant switch/max age expiry).
   - shared-device risk posture and optional at-rest encryption requirements are documented for sensitive deployments.
10. Manifest signing key custody must follow supply-chain security best practices:
   - signing private keys are non-exportable and hosted in KMS/HSM-backed systems (no plaintext key material on CI runners or release hosts).
   - signing operations are executed only in trusted CI/release identity boundaries (OIDC/service identity), never from developer workstations.
   - trust-store policy must support key rotation + revocation and block unsigned or untrusted-key signatures at startup.
11. Durable store scalability and lifecycle controls are mandatory:
   - idempotency persistence and telemetry ingest must include explicit capacity SLOs, load-test gates, and storage growth/bloat controls.
   - retention and cleanup policies must be coupled with operational thresholds (row growth, cleanup lag, index bloat) and automated alerts.
   - schema/runtime strategy must include long-horizon scale controls (partitioning/archival strategy and vacuum/analyze policy).
12. Replay-payload encryption key custody must match signing-key rigor:
   - replay-payload encryption keys are non-exportable and hosted in KMS/HSM-backed systems (no plaintext key material on app hosts, CI runners, or release hosts).
   - encryption/decryption operations use trusted runtime identities and key-versioned provider APIs; workstation-managed keys are prohibited.
   - rotation, revocation, and breakglass recovery procedures are documented and tested before any payload-persistence allowlist is enabled.

## Public API / Interface / Type Changes
1. Add `VITE_OFFLINE_MUTATION_QUEUE_ENABLED?: string` to `frontend/src/vite-env.d.ts`.
2. Add Prisma model for idempotency persistence:
   - `IdempotencyRecord` with `key`, `tenantId`, `actorType`, `actorId`, `method`, `path`, `canonicalPath`, `requestHash`, `status` (`pending` | `completed` | `failed_retryable` | `failed_terminal`), `statusCode`, `responseBody`, `digest`, `expiresAt`, `createdAt`, `updatedAt`, `lastSeenAt`
   - unique index: `(tenantId, actorType, actorId, method, canonicalPath, key)`
   - state invariants are explicit and enforced:
     - `pending`: `statusCode`/`responseBody`/`digest` are null, `lastSeenAt` required.
     - `completed`: `statusCode` + replay payload/digest required (subject to metadata-only size guardrail mode).
     - `failed_retryable`: `statusCode` optional, `responseBody` null, `digest` optional, `lastSeenAt` required.
     - `failed_terminal`: `statusCode` required, `responseBody` optional (redacted/allowlisted), `digest` required when payload committed.
   - migration enforces nullable/required transitions per status before enabling strict constraints.
   - actor resolution contract:
     - authenticated user: `actorType='USER'`, `actorId=<userId>`
     - service credential/job token: `actorType='SERVICE'`, `actorId=<serviceName|clientId>`
     - internal/system path: `actorType='SYSTEM'`, `actorId='internal'`
   - `actorType`/`actorId` are non-null for all new writes; legacy null records are migrated before enforcement.
   - canonical path migration safety:
     - legacy rows must be backfilled with `canonicalPath` using the versioned shared `routeCanonicalizer`.
     - pre-constraint uniqueness audit is required on `(tenantId, actorType, actorId, method, canonicalPath, key)`.
     - canonicalization-induced collisions must be resolved deterministically and archived before enforcing uniqueness.
3. Add backend idempotency storage abstraction:
   - `IdempotencyStore` interface, DB source-of-truth with Redis accelerator.
4. Keep/extend idempotency headers:
   - `X-Idempotent-Replay`, `X-Idempotency-Digest`
   - optional debug header: `X-Idempotency-Store` (`db`, `redis`, `db+redis`) in non-prod diagnostics only.
   - expose `Retry-After` alongside idempotency headers on retryable responses so browser clients can read authoritative backoff hints.
5. Add telemetry endpoint:
   - `POST /api/v1/telemetry/offline-sync` (authenticated, tenant-scoped, rate-limited).
   - versioned payload contract with bounded-cardinality fields and request-size guardrails.
   - explicit request contract:
     - top-level fields: `schemaVersion` (required), `batchId` (optional), `events` (required array)
     - per-event fields: `eventId` (required dedupe token), `clientTimestamp` (required freshness validation), `operation`, `result`, `network_state`, `status_bucket` (allowlisted enums)
     - numeric/versioned defaults:
       - `clientTimestamp` freshness window: `TELEMETRY_MAX_CLOCK_SKEW_MS` default `300000` (5 minutes)
       - `eventId` dedupe window: `TELEMETRY_EVENT_DEDUPE_WINDOW_MS` default `86400000` (24 hours)
       - schema/version docs must record any override from defaults before rollout.
   - explicit validation/response contract:
     - `TELEMETRY_INVALID_PAYLOAD` -> 400 (non-retryable)
     - `TELEMETRY_STALE_EVENT` -> 422 (non-retryable; outside freshness window)
     - `TELEMETRY_QUOTA_EXCEEDED` -> 429 + `Retry-After` (retryable)
     - `TELEMETRY_DUPLICATE_EVENT` -> 200 (idempotent no-op acceptance; non-retryable)
   - backend dedupe-state contract:
     - `eventId` duplicate detection is enforced by a bounded server-side dedupe store with TTL equal to `TELEMETRY_EVENT_DEDUPE_WINDOW_MS`.
     - dedupe state is tenant-scoped, capacity-limited, and subject to cleanup/expiry controls so storage cannot grow unbounded.
     - dedupe-store eviction or degradation behavior must be explicit, observable, and fail-safe for primary write protection.
6. Add queue-source contract for overlap diagnostics:
   - `X-Queue-Source: app` for app replays
   - classify SW-origin writes as `sw` for telemetry when possible.
   - define CORS `allowedHeaders`/`exposedHeaders` updates so browser clients can send/read required headers without preflight failures.
7. Standardize retry-classification contract with observability boundaries:
   - server-observable classifications:
     - `QUERY_TIMEOUT` -> 504
     - `TRANSIENT_UPSTREAM_FAILURE` -> 503
     - `RATE_LIMITED_RETRYABLE` -> 429 + `Retry-After`
     - upstream transport failures observed by server stack -> retryable transient classification
   - client-observable-only classifications (local network drop/abort before response) are emitted by frontend queue/orchestrator telemetry, not enforced as server response mapping requirements.
   - compatibility rule: emit legacy `RATE_LIMIT_EXCEEDED` alias in response metadata during migration window; remove only after client compatibility gate passes.
   - compatibility rule: emit legacy timeout/transient aliases during migration window (e.g., legacy timeout/transient codes/messages) and remove only after client compatibility gate passes.
8. Add deterministic idempotency conflict/mismatch codes:
   - `IDEMPOTENCY_REQUEST_IN_PROGRESS` -> 409 + `Retry-After`
   - `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` -> 409
9. Add deterministic auth-expiry replay code:
   - `IDEMPOTENCY_AUTH_EXPIRED_RETRYABLE` -> 401 + `Retry-After` (replay remains retryable after re-auth).
   - client compatibility contract is explicit: this code must not trigger logout/session wipe, and legacy clients are gated until compatibility checks pass.
10. Publish canonical write ownership matrix artifact:
   - one authoritative route+method table governs timeout coverage, app-queue ownership, Workbox ownership, idempotency enforcement phase, and intentional exclusions.

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
   - include migration/backfill script for existing records:
     - map known user-origin rows to `actorType='USER'` + resolved `actorId`
     - map unresolvable legacy rows to `actorType='SYSTEM'`, `actorId='legacy'`
     - detect/deduplicate legacy collisions before adding unique index using deterministic winner rules (status precedence + latest `updatedAt`) and archive/tombstone losers for auditability.
     - enforce non-null + unique index only after backfill verification succeeds and collision report is clean.
   - use reversible migration staging (expand -> backfill -> validate -> contract), with explicit rollback notes at each stage.
   - define migration abort thresholds before contract phase (lock timeout, migration error-rate, unresolved collision count) and stop criteria if exceeded.
   - require snapshot/backup checkpoint before irreversible steps (non-null + unique constraint contract phase).
   - canonicalPath backfill and verification sequence is mandatory:
     - run an expand migration that adds nullable `canonicalPath`.
     - populate `canonicalPath` for existing rows using the shared versioned `routeCanonicalizer`.
     - run dry-run and enforced uniqueness audits on `(tenantId, actorType, actorId, method, canonicalPath, key)`.
     - resolve and archive canonicalization collisions using deterministic winner rules before contract migration.
     - enforce `canonicalPath` requiredness only after zero unresolved collisions are confirmed.
2. Implement backend store components:
   - DB repository for canonical persistence and replay lookup
   - Redis accessor for fast cache hit path with matching TTL
3. Refactor `src/middleware/idempotency.ts` to use store abstraction.
4. Request flow:
   - On key present, read Redis, fallback DB.
   - reject invalid idempotency keys before store lookup using canonical validation rules (format, length, charset, decode validity); return deterministic non-retryable error code.
   - key handling is validation-only and byte-stable after decode; no semantic normalization/transformation is allowed.
   - `requestHash` uses a deterministic canonicalization contract shared by frontend and backend from a single shared implementation artifact (not duplicated logic): stable JSON key ordering, UTF-8 normalization, explicit inclusion/exclusion of request components, and a defined multipart/file-upload hashing strategy.
   - On record hit, always validate `requestHash` equality first; mismatch returns `409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`.
   - If record status is `completed` or `failed_terminal` and unexpired, replay stored response.
   - Before controller side effects, compute canonical route identity and attempt atomic DB reservation (`pending`) for `(tenantId, actorType, actorId, method, canonicalPath, key)`.
   - canonical-path rollout must use shadow/compare mode before enforcement:
     - while `IDEMPOTENCY_CANONICAL_ENFORCE=false`, compute both legacy `path` key and `canonicalPath` key, emit divergence metrics, and keep legacy enforcement authoritative.
     - promote `IDEMPOTENCY_CANONICAL_ENFORCE=true` only after shadow divergence is <= 0.1% over a 72-hour window and no high-severity route mismatches remain.
     - retain rollback toggle to revert to legacy enforcement if post-promotion divergence alerts trigger.
   - If reservation already exists as fresh `pending`/`failed_retryable`, return `409 IDEMPOTENCY_REQUEST_IN_PROGRESS` with adaptive `Retry-After` (bounded, jitter-compatible value such as 1-10s) and no side effects.
   - `pending` reservations use lease semantics with `leaseExpiresAt`; handlers extend lease heartbeat while work is active.
   - stale reclaim is allowed only when lease is expired and no active heartbeat is observed.
   - If existing `pending` is stale (lease expired beyond `IDEMPOTENCY_PENDING_STALE_MS`, default 30000), atomically reclaim reservation via compare-and-set and continue.
   - If existing `failed_retryable` is stale (`updatedAt` older than `IDEMPOTENCY_RETRYABLE_STALE_MS`, default 30000), atomically reclaim reservation via compare-and-set and continue.
   - On first successful 2xx, transition `pending -> completed`, persist replay payload, then cache Redis.
   - asynchronous `202 Accepted` mutation routes must declare explicit idempotency semantics in the ownership matrix:
     - either excluded from replayable `completed` contract, or
     - replay returns deterministic operation token/job identifier with duplicate job creation prevention guarantees.
   - Final state transitions are determined solely by the response-classification matrix below; no pre-matrix fallback classification is authoritative.
   - Idempotency response-classification matrix is exhaustive and authoritative:
     - 2xx: `completed`.
     - 3xx on covered mutation routes: `failed_terminal` (treat redirect responses as non-retryable misconfiguration unless explicitly allowlisted).
     - 4xx:
       - `IDEMPOTENCY_REQUEST_IN_PROGRESS` -> retryable 409 (state preserved; no terminalization).
       - `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` -> terminal 409 (no side effects; no replay mutation of existing completed record).
       - retryable auth-expiry cases (`IDEMPOTENCY_AUTH_EXPIRED_RETRYABLE`) -> `failed_retryable`.
       - all other 401/403/404/405/409(domain)/410/412/415/422/423/424/428 -> `failed_terminal` unless explicitly listed as retryable in the ownership matrix.
       - 408 (`REQUEST_TIMEOUT`) -> `failed_retryable`.
     - 429/5xx/query-timeout/server-observed transport failures: `failed_retryable`.
     - uncaught exceptions/unknown classifications: default to `failed_retryable` with bounded expiry and deterministic `UNKNOWN_RETRYABLE` code until classified.
   - no response path may leave a reservation stuck in `pending` after handler completion; contract tests enforce closure to `completed`/`failed_retryable`/`failed_terminal`.
   - 409 handling is explicit and code-driven (never generic by status alone):
     - `IDEMPOTENCY_REQUEST_IN_PROGRESS`: return retryable 409 + adaptive `Retry-After`, preserve current reservation state (`pending`/`failed_retryable`), no terminalization.
     - `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`: return terminal 409 conflict, execute no side effects, and do not mutate an existing completed replay record.
   - On auth/session-expiry errors (401 and retryable 403 cases such as CSRF/session refresh), transition to `failed_retryable` and return `IDEMPOTENCY_AUTH_EXPIRED_RETRYABLE`; do not pin terminal outcome.
   - On authorization-denied errors (non-retryable 403 such as `ACCESS_DENIED`/`AUTHORIZATION_ERROR`), transition to `failed_terminal`.
   - On transient/unknown failure (429/5xx/timeout/server-observed transport failure), transition to `failed_retryable` with short expiry/heartbeat, no replay payload commitment.
   - On Redis miss + DB hit, repopulate Redis.
   - Crash-window semantics are explicit and mandatory:
     - for DB-backed mutations on covered routes where business side effects are transaction-capable, perform idempotency completion write in the same DB transaction as business side effects.
     - if transaction-bound completion write fails, entire transaction rolls back (no committed side effect without idempotency state).
     - for non-transactional/external side effects (or handlers that span mixed service boundaries), write `pending` reservation first, execute side effect, then on duplicate hit run a reconciliation probe (deterministic lookup by mutation fingerprint) before reclaiming stale reservation.
     - reconciliation probe result:
       - found side effect => transition to `completed` and replay.
       - not found and stale timeout exceeded => reclaim reservation and execute once.
   - Replay payload persistence guardrails:
     - allowlist-first replay envelope for persisted response fields (`success`, `code`, `message`, `data.id`, `data.status`, correlation identifiers)
     - apply denylist redaction as defense-in-depth: `password`, `access_token`, `refresh_token`, `signature`, `secret`
     - enforce max serialized replay payload size (`IDEMPOTENCY_MAX_RESPONSE_BYTES`, default 65536)
     - if over limit after redaction, store minimal replay envelope (status/code/message/digest) and mark replay mode as metadata-only
     - enforce encryption-at-rest for persisted replay payload fields using non-exportable KMS/HSM-backed keys and key-rotation policy controls.
     - default to metadata-only persistence unless a route is explicitly allowlisted for payload persistence.
     - require access-audit logging for replay payload reads outside normal replay flow.
5. TTL:
   - 24h default
   - env-configurable with min/max guardrails
6. Expired record cleanup:
   - scheduled cleanup task for DB rows by `expiresAt`
   - in multi-instance deployments, cleanup ownership uses a single-runner lock strategy (e.g., DB advisory lock/leader election), bounded batch size, and bounded runtime to prevent stampedes
7. Multi-instance safety:
   - DB uniqueness is the dedupe authority.
   - Redis is acceleration only, never the only source.
   - stale `pending` reclamation and expiry cleanup emit metrics (rows scanned/deleted, reclaim attempts, lock contention, failures) and have alert thresholds.
8. Concurrency and recovery tests:
   - same idempotency key submitted concurrently across processes executes side effects at most once.
   - stale `pending` reservations are reclaimed by timeout/cleanup policy.
   - side-effect-committed/completion-write-failed cases are reconciled without duplicate side effects.
   - same idempotency key with different payload returns `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` and does not execute side effects.
   - auth-expiry replay does not become terminal; after successful re-auth the same key can complete exactly once.
   - shared request-hash fixture vectors pass identically in backend and frontend runtimes (parity gate for canonicalizer).
   - path-variant fixture vectors (trailing slash/casing/encoded path variants/version alias forms) map to one canonical route identity and one idempotency reservation keyspace.

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
   - rate-limit -> 429 + `RATE_LIMITED_RETRYABLE` + `Retry-After`
   - server-observed transport failures -> mapped to retryable transient classification with stable payload fields
   - client-only network abort/drop before response -> classified in frontend telemetry/queue policy (not required as server response mapping)
   - all retryable mappings that include retry semantics return readable `Retry-After` when applicable.
7. Add regression guard: timeout response must imply DB write cancellation for covered mutation paths.
8. Extend timeout middleware wiring/verification to all Prisma construction paths (request-scoped, container-resolved, replica/read variants).
9. Canonical error payload fields are versioned and contract-tested end-to-end.
10. Backward compatibility for timeout/transient contracts is explicit:
   - migration payloads include canonical fields plus legacy alias fields/messages for pre-upgrade clients.
   - OpenAPI examples include canonical-only target form and migration-era dual form.
   - alias removal is blocked until compatibility matrix gate passes for each client/integration class.
11. Covered timeout-enforced route set is sourced from the canonical write ownership matrix artifact (no duplicated route literals across sections).
12. All covered routes must execute Prisma writes via a shared `withMutationTimeoutTx` helper that sets `SET LOCAL statement_timeout` before write operations.
13. All covered non-Prisma mutation paths (raw SQL/query builders) must execute through a shared timeout-enforcing DB helper that applies transaction-scoped statement timeout with equivalent cancellation semantics.
14. Any write path that cannot support transaction-scoped timeout must be explicitly excluded in the canonical write ownership matrix with rationale, compensating controls, and owner approval before rollout.

## Phase 4: Dual Queue Guardrails (App Queue + Workbox Sync)
1. Keep both queues but define responsibilities:
   - app queue = only queue for scoring/commentary JSON mutations
   - Workbox queue = only queue for score-file uploads/updates where browser SW retry is preferred
2. Queue precedence is deterministic:
   - queue ownership is defined by a single shared route+method manifest consumed by app queue logic, Workbox routing, and tests.
   - authoritative artifact:
     - `config/offline-write-ownership.manifest.json` (repo-level source of truth consumed by backend + frontend)
     - generated/typed frontend projections:
       - `frontend/src/config/offlineWriteOwnership.manifest.ts`
       - `frontend/src/config/offlineWriteOwnership.manifest.json`
   - ownership rules:
     - only this manifest defines queue ownership
     - backend timeout/idempotency enforcement reads the root source manifest (`config/offline-write-ownership.manifest.json`).
     - frontend runtime consumers (`frontend/vite.config.ts`, queue selectors, and tests) read generated frontend projections only (`frontend/src/config/offlineWriteOwnership.manifest.ts` / `.json`) produced from the root source manifest.
   - generation and CI parity checks enforce source/projection drift prevention (no duplicated route literals).
   - generation lifecycle is explicit:
     - local dev: generator runs via `npm run build:offline-write-ownership` (or equivalent) and is required before frontend dev/build.
     - CI: parity check runs in required status checks and fails on drift.
     - release build: generator runs in prebuild stage for backend/frontend artifacts.
   - manifest integrity is cryptographically verifiable:
     - source manifest is signed in CI/release packaging.
     - backend startup verifies signature against trusted key material before enabling covered write routes.
     - signature envelope includes `keyId`, `algorithm`, `manifestHash`, and `signedAt`.
     - trust validation checks key status (active/revoked), allowed algorithm set, and optional max signature age policy.
     - invalid signature is treated as invalid manifest under strict/non-strict behavior.
   - CI fails if generated artifact drifts from source.
   - packaging/runtime contract is explicit:
     - backend runtime reads packaged `config/offline-write-ownership.manifest.json` from deploy artifact (not from source checkout assumptions).
     - startup fail-fast in strict mode if source manifest missing/invalid/version-mismatched; non-strict mode serves writes disabled for covered routes and emits critical alerts.
     - non-strict mode uses scoped protection controls to limit blast radius:
       - disable only matrix-covered write routes that cannot be safely owned, keep unrelated read routes and non-covered writes available.
       - expose an explicit operator kill-switch to force strict fail-fast if partial availability is not acceptable for the environment.
       - require an incident runbook with 15-minute recovery target for manifest restore/regeneration, plus rollback path to last known-good manifest artifact.
     - frontend projections embed the same manifest version/hash as backend source; startup diagnostics verify parity.
   - if endpoint belongs to app-queue domain, Workbox must not enqueue it
   - if endpoint belongs to Workbox domain, app queue must not enqueue it
   - build/test validation fails on overlapping ownership or manifest drift.
   - `X-Queue-Source` header is retained for diagnostics/telemetry attribution
3. For all queued write paths:
   - require idempotency key on every mutation (phased enforcement per compatibility plan where needed)
   - preserve key through replay paths unchanged
4. Confirm Workbox runtime rules:
   - write endpoints remain `NetworkOnly`
   - mutation responses are not cached as read data
   - method coverage matrix comes only from the canonical write ownership matrix artifact (including explicit score-file `PUT`/`PATCH`/`DELETE` decisions and rationale where not implemented).
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
   - Define auth/session-expiry behavior during offline flush (refresh/retry/degrade/drop semantics):
     - max refresh attempts per flush window (default 1), then bounded retry schedule
     - deterministic drop conditions (`auth_refresh_exhausted`, `token_invalid_terminal`, `max_event_age_exceeded`) with counters
     - circuit-breaker backoff to prevent retry storms when auth endpoint is degraded
   - Ensure telemetry ingest failures are non-blocking for scoring/commentary writes.
   - Define retention windows and field-level redaction enforcement point.
   - Define bounded client telemetry buffering: max queue size, max event age, retry schedule/attempt cap, and deterministic drop policy with reason counters.
   - Fixed metric label schema (no tenant/user/request IDs in labels):
     - `queue_source`: `app|sw`
     - `operation`: `submit_score|update_score|create_comment|update_comment|upload_score_file`
     - `result`: `enqueued|replay_success|replay_retry|replay_permanent_failure|dropped`
     - `network_state`: `online|offline|unknown`
     - `status_bucket`: `2xx|4xx|429|5xx|timeout|network_error`
   - Tenant/user correlation remains in logs/event storage only, not Prometheus label cardinality.
   - Add abuse resistance controls beyond authentication:
     - per-tenant/per-actor quotas (burst + sustained windows) with deterministic 429 handling.
     - payload freshness checks (timestamp skew bounds) and optional nonce/event-id dedupe for replayed batches.
     - malformed-payload strike counters with progressive throttling to protect ingest capacity.
     - edge/API-gateway protections (route-specific rate limits and strict request-size ceilings).
   - telemetry dedupe-state operations are explicit:
     - define dedupe-store backend, TTL expiry cadence, max cardinality thresholds, and alerting on dedupe-store saturation/eviction.
     - promotion is blocked if dedupe-store saturation or eviction exceeds documented thresholds.
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
   - phase promotion is additionally gated by explicit error-budget burn-rate policy (fast/slow burn thresholds), with automatic freeze when exceeded.
   - phase advancement/resume after freeze requires recorded owner approval and stabilization window completion.
   - canonical-path enforcement promotion is independently gated by shadow/compare metrics and explicit owner approval record.
5. Rollback procedure:
   - disable queue feature flag safely
   - retain online-write behavior
   - preserve idempotency protections
   - database rollback path for in-flight idempotency migration is defined per stage:
     - expand/backfill stages are reversible by schema + code rollback.
     - contract stage requires pre-captured backup/snapshot for full data rollback; otherwise use forward-fix playbook.
6. TTL invariant enforcement gates:
   - add startup/runtime invariant checks that enforce:
     - app queue max replay horizon <= server idempotency TTL (unless explicit fallback mode is enabled)
     - Workbox retention <= server idempotency TTL (unless explicit fallback mode is enabled)
     - Redis TTL <= DB `expiresAt`
   - strict mode fails startup on invariant violations; non-strict mode emits error logs + metrics and blocks phase advancement.
   - expose invariant status in health/diagnostic telemetry for deployment gate checks.
7. Long-horizon storage operations and bloat controls:
   - define idempotency and telemetry table maintenance policy:
     - scheduled vacuum/analyze cadence for high-churn tables
     - index health checks and reindex criteria
     - cleanup lag budget with alert thresholds
   - define archival/partition lifecycle for `IdempotencyRecord`:
     - default strategy: range partition by `expiresAt` (monthly partitions) with automated partition creation and aged partition drop after retention.
     - if partitioning is deferred by compatibility constraints, require explicit exception record with compensating controls and a dated migration deadline.
   - add storage growth SLO gates:
     - idempotency table growth rate, cleanup lag, and bloat percentage must remain within documented thresholds before phase promotion.

## Phase 7: Test and Verification Gates
1. Backend unit tests:
   - idempotency replay hit/miss and TTL behavior
   - timeout/transient mapping contract assertions
2. Backend integration tests:
   - replay behavior across restart simulation
   - replay behavior across multi-instance simulation
   - pending-reservation crash-window reconciliation behavior
   - CORS preflight coverage for replay/idempotency headers on write routes
   - CORS/readability coverage for `Retry-After` on retryable 401/409/429 responses
   - raw SQL/non-Prisma write-path timeout cancellation parity coverage for matrix-listed routes
   - telemetry ingest outage/latency does not block primary write success
   - canonical route identity normalization tests verify path variants collapse to a single idempotency reservation scope
   - canonical shadow-mode parity tests verify divergence accounting and safe promotion criteria behavior before canonical enforcement enablement
   - canonicalPath backfill migration tests validate deterministic collision handling and zero unresolved-collision contract gate
   - telemetry abuse controls (quota/freshness/malformed payload throttling) enforce bounded ingest resource usage
3. Frontend service tests:
   - enqueue on retryable timeout/network failure
   - replay on reconnect/foreground
   - retry cap and permanent failure path
   - ordering guarantees for same entity stream
   - Workbox method coverage parity checks for configured write endpoints (`POST`/`PUT`/`PATCH`/`DELETE` or documented exclusions)
   - TTL mismatch behavior when client replay exceeds server idempotency retention
   - `IDEMPOTENCY_AUTH_EXPIRED_RETRYABLE` does not trigger logout for compatible clients and replays after successful re-auth
   - client-observable transport abort classification is emitted to telemetry and queue policy correctly
   - generated ownership projection parity checks against source manifest fixtures
4. Configuration invariant tests:
   - startup/runtime TTL invariant checks fail as expected on misconfiguration and pass on valid bounds.
5. E2E/manual scenario verification:
   - online save
   - forced timeout and retry
   - offline enqueue
   - reconnect sync
   - duplicate prevention
   - telemetry flush with expired auth/session and expected degrade behavior
   - shared queue-routing manifest parity test between app and Workbox consumers
   - request-hash canonicalization parity tests across frontend/backend fixtures
6. Final gate commands:
   - `git status --short`
   - `npm run build`
   - `cd frontend && npm run build`
   - targeted reliability/offline test suites
7. Additional rollout gate assertions:
   - manifest source/projection hash parity verified in CI and at runtime startup diagnostics.
   - manifest signature verification passes in CI and at runtime startup diagnostics.
   - idempotency classification matrix contract tests prove no terminal handler path leaves `pending`.
   - timeout/transient legacy alias compatibility tests pass for all listed pre-upgrade clients/integrations.

## Phase 8: Capacity and Data-Lifecycle Hardening
1. Capacity model and baseline:
   - define expected steady-state and burst envelopes:
     - steady-state write QPS per tenant and global
     - offline replay burst multiplier assumptions
     - telemetry event throughput and batch sizes
   - publish target SLOs for p95/p99 latency and error rates under modeled load.
2. Load and soak validation:
   - run load tests for idempotency read/write paths, replay storms, and telemetry ingest at projected peak and 2x projected peak.
   - run 24-hour soak tests with cleanup jobs enabled to validate stability under churn.
   - require pass/fail thresholds before enabling hard-fail rollout phases.
3. Storage and maintenance validation:
   - validate partition/cleanup operations at scale (partition create/drop, expired-row purge, index maintenance) in staging-like data volume.
   - measure and gate on cleanup job duration, lock contention, and query performance impact.
4. Release-gate integration:
   - block promotion when capacity gates fail (latency/error/bloat/cleanup lag thresholds).
   - require explicit owner sign-off for any temporary exception with expiration date and rollback plan.

## File-Level Deliverables
1. Frontend:
   - `frontend/src/vite-env.d.ts`
   - `frontend/src/services/offlineMutationQueue.ts`
   - `frontend/src/services/offlineSyncOrchestrator.ts`
   - `frontend/src/services/api.ts` (401 handling compatibility for `IDEMPOTENCY_AUTH_EXPIRED_RETRYABLE`)
   - `frontend/src/pages/ScoringPage.tsx`
   - `frontend/src/config/offlineWriteOwnership.manifest.ts`
   - `frontend/src/config/offlineWriteOwnership.manifest.json`
   - `frontend/vite.config.ts`
   - `frontend/public/offline.html`
2. Backend:
   - `src/middleware/idempotency.ts`
   - `src/config/database.ts`
   - `src/config/queryTimeouts.ts`
   - `src/utils/dbMutationTimeout.ts` (or equivalent wrapped execution module for non-Prisma write paths)
   - `src/security/manifestSignature.ts` (manifest signature verification and key-id enforcement)
   - `src/security/manifestSigningClient.ts` (KMS/HSM-backed signing client used by CI/release pipeline)
   - `src/config/manifestTrustStore.ts` (trusted manifest signing key source, rotation, and revocation controls)
   - `src/security/replayPayloadCrypto.ts` (envelope encryption/decryption helper for replay payload persistence)
   - `src/config/replayPayloadCrypto.ts` (KMS/HSM-backed key provider wiring, key versioning, rotation policy controls)
   - `src/config/express.config.ts` (CORS allow/expose header updates for replay/idempotency headers plus `Retry-After` exposure)
   - `src/middleware/errorHandler.ts`
   - telemetry route/controller/service files
   - `src/services/TelemetryDedupeStore.ts` (bounded tenant-scoped `eventId` dedupe store with TTL/cleanup semantics)
   - `src/services/MetricsService.ts`
3. Shared configuration:
   - `config/offline-write-ownership.manifest.json`
   - `config/offline-write-ownership.manifest.sig` (detached signature artifact persisted with release package)
   - `scripts/build/generate-offline-write-ownership-manifest.ts` (or equivalent generator + parity check entrypoint)
   - `scripts/build/sign-offline-write-ownership-manifest.ts` (CI/release signing step)
   - `scripts/ci/sign-manifest-with-kms.sh` (trusted-boundary signing wrapper; no local private key files)
   - build hooks/wiring for generator in backend/frontend build pipelines and CI required checks
   - `shared/idempotency/requestHashCanonicalizer.ts` (single shared implementation artifact consumed by backend + frontend)
   - `shared/idempotency/requestHashCanonicalizer.fixtures.json` (canonical parity vectors for backend/frontend contract tests)
   - `shared/idempotency/routeCanonicalizer.ts` (single shared canonical route identity implementation consumed by idempotency middleware/repository)
   - `shared/idempotency/routeCanonicalizer.fixtures.json` (path-variant canonicalization fixture vectors)
4. Data model:
   - `prisma/schema.prisma`
   - idempotency migration files
5. Tests:
   - backend unit/integration additions for idempotency and timeout
   - frontend tests for queue/orchestrator/retry behavior
   - configuration invariant tests for TTL alignment and source/projection manifest parity
   - replay-payload encryption tests: encrypt/decrypt correctness, KMS/HSM-backed key-provider enforcement, key-version tagging, and dual-read/single-write rotation compatibility
   - manifest degraded-mode tests: scoped route disablement behavior and strict-mode kill-switch enforcement
   - manifest signature tests: valid signature acceptance, tampered manifest rejection, revoked/unknown `keyId` rejection, and signature-age policy enforcement
   - telemetry ingest contract tests: freshness window handling (including 300000ms skew boundaries), duplicate `eventId` handling (including 86400000ms dedupe window), and quota 429 behavior with `Retry-After`
   - shared route canonicalizer tests: path-variant collapse and reverse-proxy rewrite compatibility fixtures
   - load/soak tests for idempotency and telemetry throughput at projected and 2x projected peak load
   - storage lifecycle tests for partition creation/drop, cleanup lag enforcement, and bloat-threshold alerting
   - telemetry dedupe-store tests: TTL expiry, tenant scoping, saturation behavior, eviction/cleanup semantics, and duplicate acceptance guarantees
6. Documentation:
   - update checklist status
   - add rollout and rollback runbook details
   - update ADR for final dual-queue interaction model
   - document telemetry schema versioning + cardinality constraints
   - document idempotency reservation (`pending`) semantics and recovery behavior
   - publish/update API reference (OpenAPI or equivalent) for new headers, error codes, phase behavior, and client compatibility timeline
   - include migration-era compatibility examples (canonical + legacy aliases) for timeout/transient/rate-limit contracts
   - publish migration rollback runbook for `IdempotencyRecord` expand/backfill/contract lifecycle and abort thresholds
   - document phase-promotion gate metrics, approval owners, and runbook recording requirements
   - document idempotency-key validation/abuse controls, offline-queue storage security posture, and error-budget freeze/override policy
   - document replay-payload encryption key lifecycle (generation, KMS/HSM custody, storage, rotation cadence, revocation, breakglass recovery)
   - document manifest incident response for non-strict degraded mode, scoped kill-switch usage, and recovery/rollback timelines
   - document manifest signing key lifecycle and trust-store operations (generation, distribution, rotation, revocation, breakglass verification)
   - document route-canonicalization rules for idempotency scoping and reverse-proxy rewrite compatibility requirements
   - publish canonicalPath backfill and shadow-rollout runbook (metrics, thresholds, promotion/rollback criteria, and operator actions)
   - document telemetry abuse controls (quota model, freshness window, malformed-payload throttling, and response semantics)
   - document telemetry dedupe-store architecture, retention/cleanup policy, and saturation/eviction operational response
   - document data-governance lifecycle for replay payload records (retention, erasure/offboarding handling, and legal-hold exceptions)
   - document signer key custody policy (non-exportable KMS/HSM keys, trusted CI identity boundary, workstation signing prohibition)
   - publish capacity model and SLO thresholds (steady-state and burst assumptions) for rollout sign-off
   - document idempotency/telemetry storage maintenance policy (partitioning, vacuum/analyze cadence, bloat and cleanup-lag thresholds)

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
9. Security robustness gates are met before release:
   - replay-payload encryption-at-rest is enabled for all allowlisted payload-persistence routes.
   - replay-payload encryption keys are hosted in non-exportable KMS/HSM-backed systems and plaintext host-managed keys are not used.
   - at least one key-rotation drill (dual-read/single-write path) passes in non-prod with documented evidence.
   - manifest degraded-mode recovery drill meets runbook target and operator kill-switch behavior is verified.
   - manifest signature verification is enforced and at least one tamper-detection drill passes in non-prod with documented evidence.
   - replay-payload data-governance controls are validated in non-prod (retention expiry + erasure/offboarding flow evidence).
10. Error-budget governance is defined and enforced:
   - fast- and slow-burn calculations are published for core reliability SLOs.
   - any burn-rate breach blocks phase promotion until stabilization criteria are met.
   - override path requires documented risk acceptance and owner approvals in rollout changelog.
11. Canonical-path migration and rollout gates are met before release:
   - canonicalPath backfill completes with zero unresolved uniqueness collisions.
   - shadow/compare divergence is <= 0.1% for 72 continuous hours before canonical enforcement is enabled.
   - canonical enforcement rollback toggle is validated in non-prod.
12. Telemetry abuse-window controls are numerically versioned and enforced:
   - freshness window default `TELEMETRY_MAX_CLOCK_SKEW_MS=300000` is enforced at boundary conditions.
   - dedupe window default `TELEMETRY_EVENT_DEDUPE_WINDOW_MS=86400000` is enforced at boundary conditions.
   - any override from defaults is documented in schema/version rollout artifacts before promotion.
13. Capacity and lifecycle scalability gates are met before release:
   - load tests pass at projected peak and 2x projected peak with documented p95/p99 latency and error-rate thresholds.
   - 24-hour soak tests pass with cleanup jobs enabled and no sustained degradation.
   - idempotency and telemetry storage controls meet thresholds for cleanup lag, bloat percentage, and lock contention.
   - telemetry dedupe-store saturation and eviction stay within documented thresholds during peak and soak validation.

## Assumptions and Defaults
1. Idempotency retention defaults to 24 hours.
2. DB is authoritative; Redis is acceleration.
3. Dual queue remains in place with strict guardrails and dedupe.
4. Telemetry stores operational metadata only, not sensitive mutation payloads.
5. Rollout is staged and feature-flagged before broad production enablement.
6. A single shared queue-routing manifest is authoritative for app and Workbox write ownership.
7. Request-hash canonicalization is standardized across all mutation producers.
8. TTL invariants are enforced:
   - Redis replay entry TTL must never exceed DB `expiresAt`.
   - App queue retry horizon and Workbox retention must not exceed server idempotency retention unless fallback behavior is explicitly documented.
