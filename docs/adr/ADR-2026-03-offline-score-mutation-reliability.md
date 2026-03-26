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

## Idempotency
- Frontend attaches `X-Idempotency-Key` on state-changing writes.
- Backend scoring/commentary endpoints deduplicate by key+tenant+route and return the previously successful response.
- TTL for de-duplication records: 24 hours.

## Replay ordering and conflict policy
- Queue replays in creation order.
- Entity ordering key (`entityKey`) groups operations for the same score/comment stream.
- If replay repeatedly fails (`MAX_REPLAY_FAILURES`), mark as permanent failure and require explicit user action.
- Server remains source of truth for conflicts; deterministic replay relies on idempotency key response reuse.

## Consequences
- Prevents duplicate submissions from retries and reconnect replay.
- Users receive truthful save state messaging.
- File upload replay remains best-effort and not yet fully durable across reloads; score/comment writes are the primary durable target.
