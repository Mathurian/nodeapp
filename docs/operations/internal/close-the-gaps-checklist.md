# Close-the-Gaps Checklist

This checklist captures the remaining work needed to close the reliability and readiness gaps identified in the scoring/commentary offline-sync implementation.

## 1) Restore green build and typing
- [x] Add `VITE_OFFLINE_MUTATION_QUEUE_ENABLED` to frontend env typings (`vite-env.d.ts` or equivalent) so TypeScript recognizes the flag.
- [x] Resolve `enqueueMutation` payload mismatch by making `lastError` optional at creation time (or provide a default value at all enqueue callsites).
- [ ] Run and verify:
  - [x] `npm run build` (backend)
  - [x] `cd frontend && npm run build` (frontend)

## 2) Remove unintended workspace drift
- [ ] Revert or otherwise clean modified files under `node_modules/` from working tree.
- [ ] Confirm only intended project files remain changed with `git status --short`.

## 3) Harden backend idempotency persistence
- [x] Replace in-memory idempotency `Map` with shared durable storage (Redis or database table).
- [x] Enforce TTL/expiry policy on idempotency records.
- [x] Ensure multi-instance safety (dedupe works across all app replicas).
- [ ] Add tests validating duplicate replay behavior after process restart and across instances.

## 4) Wire backend timeout semantics end-to-end
- [x] Verify `queryTimeout` middleware is actually attached where intended.
- [x] Standardize timeout/transient error response codes in `errorHandler` for reliable client retry classification.
- [ ] Add integration tests for timeout pathways and client-visible error codes.

## 5) Validate offline queue + replay behavior thoroughly
- [ ] Add/confirm tests for:
  - [ ] enqueue on retryable timeout/network failure
  - [ ] replay on reconnect/app foreground
  - [ ] per-item retry cap and poison-message handling
  - [ ] ordering guarantees for same scoring entity
- [ ] Confirm no duplicate submissions when retries/replays occur with idempotency keys.

## 6) Confirm Workbox write-sync behavior is safe
- [ ] Validate Background Sync route matching for scoring/commentary write endpoints.
- [ ] Confirm mutation responses are not cached as read content.
- [x] Define and document interaction model if both app queue and service-worker queue exist (single source of truth + dedupe).

## 7) Tighten user-facing messaging consistency
- [ ] Verify all scoring/commentary mutation states use truthful, specific messaging:
  - [x] Saving
  - [x] Retrying (network unstable)
  - [x] Saved offline / queued
  - [x] Syncing queued updates
  - [x] Synced
  - [x] Sync failed (actionable retry)
- [x] Ensure rollback only occurs for definitive failures that are not queued.
- [x] Re-verify `offline.html` copy matches actual implemented guarantees and limitations.

## 8) Operational readiness and rollout controls
- [x] Confirm feature flag defaults and staged rollout plan.
- [ ] Add telemetry dashboards/alerts for queue depth, replay success rate, permanent failures, and sync delay.
- [x] Document rollback procedure (disable queue/sync safely without losing online writes).

## 9) Final verification gate (must pass)
- [x] `git status --short` clean except intended files.
- [x] Backend + frontend builds pass.
- [x] Targeted reliability/offline test suites pass.
- [ ] End-to-end manual scenario check:
  - [ ] online save
  - [ ] forced timeout + retry
  - [ ] offline enqueue
  - [ ] reconnect sync
  - [ ] duplicate prevention

## Definition of Done
- [ ] No score/comment mutation is silently dropped during timeout/offline events.
- [ ] Users always get accurate status feedback about save/sync state.
- [ ] Idempotency is durable and correct across restarts/instances.
- [ ] Documentation and offline messaging are accurate and non-misleading.
- [ ] CI gates pass and release rollback is documented.
