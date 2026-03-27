# ADR: Scoring mutation reliability contract

- **Date:** 2026-03-26
- **Status:** Accepted

## Context
Scoring and commentary workflows must tolerate transient outages without silently losing writes.

## Decision
1. **Online + healthy network:** write operations submit immediately.
2. **Online + transient timeout/network instability:** bounded retry (max attempts + elapsed cap) with exponential backoff and jitter.
3. **Offline or retry exhaustion for retryable errors:** durable IndexedDB queue entry persisted and replayed automatically.
4. **User-visible state contract:** UI always reflects one of `saving`, `retrying`, `queued`, `syncing`, `synced`, `failed`.
5. **Queue ownership is manifest-driven:** app queue owns scoring/commentary JSON writes, Workbox owns score-file upload/update writes, and overlap is prohibited.
6. **Durable idempotency is authoritative:** DB-backed idempotency records are the source of truth; Redis is an accelerator only.
7. **Telemetry is centralized:** offline replay outcomes are emitted to the backend telemetry ingest endpoint using a bounded-cardinality schema.
8. **Manifest integrity is enforced:** route-ownership manifest projections are generated from one source file and verified by signature and anti-rollback state before covered writes are trusted.

## Idempotency
- Frontend attaches `X-Idempotency-Key` on state-changing writes.
- Backend covered write endpoints deduplicate by key+tenant+actor+canonical route and return the previously successful response.
- TTL for de-duplication records: 24 hours.
- Missing or invalid keys on enforced routes fail deterministically.
- Retryable auth/session expiry is not terminalized; the same key may complete after re-auth.

## Replay ordering and conflict policy
- Queue replays in creation order.
- Entity ordering key (`entityKey`) groups operations for the same score/comment stream.
- If replay repeatedly fails (`MAX_REPLAY_FAILURES`), mark as permanent failure and require explicit user action.
- Server remains source of truth for conflicts; deterministic replay relies on idempotency key response reuse.
- `pending` reservations use lease semantics; stale reservations are reclaimed only after expiry and reconciliation rules.

## Consequences
- Prevents duplicate submissions from retries and reconnect replay.
- Users receive truthful save state messaging.
- File uploads remain in the Workbox-only domain and do not share the app queue.
- Covered writes now depend on manifest integrity and TTL invariants at startup.
- Offline queue persistence is deliberately constrained: restricted fields are not allowed, queue entries are internal-only, and queue state is purged on logout or session/tenant change.
