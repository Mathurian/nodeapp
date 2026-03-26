# Close-the-Gaps Checklist

This checklist captures the remaining work needed to close the reliability and readiness gaps identified in the scoring/commentary offline-sync implementation.

## 1) Restore green build and typing
- [ ] Add `VITE_OFFLINE_MUTATION_QUEUE_ENABLED` to frontend env typings (`vite-env.d.ts` or equivalent) so TypeScript recognizes the flag.
- [ ] Resolve `enqueueMutation` payload mismatch by making `lastError` optional at creation time (or provide a default value at all enqueue callsites).
- [ ] Run and verify:
  - [ ] `npm run build` (backend)
  - [ ] `cd frontend && npm run build` (frontend)

## 2) Remove unintended workspace drift
- [ ] Revert or otherwise clean modified files under `node_modules/` from working tree.
- [ ] Confirm only intended project files remain changed with `git status --short`.

## 3) Harden backend idempotency persistence
- [ ] Replace in-memory idempotency `Map` with shared durable storage (Redis or database table).
- [ ] Enforce TTL/expiry policy on idempotency records.
- [ ] Ensure multi-instance safety (dedupe works across all app replicas).
- [ ] Add tests validating duplicate replay behavior after process restart and across instances.

## 4) Wire backend timeout semantics end-to-end
- [ ] Verify `queryTimeout` middleware is actually attached where intended.
- [ ] Standardize timeout/transient error response codes in `errorHandler` for reliable client retry classification.
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
- [ ] Define and document interaction model if both app queue and service-worker queue exist (single source of truth + dedupe).

## 7) Tighten user-facing messaging consistency
- [ ] Verify all scoring/commentary mutation states use truthful, specific messaging:
  - [ ] Saving
  - [ ] Retrying (network unstable)
  - [ ] Saved offline / queued
  - [ ] Syncing queued updates
  - [ ] Synced
  - [ ] Sync failed (actionable retry)
- [ ] Ensure rollback only occurs for definitive failures that are not queued.
- [ ] Re-verify `offline.html` copy matches actual implemented guarantees and limitations.

## 8) Operational readiness and rollout controls
- [ ] Confirm feature flag defaults and staged rollout plan.
- [ ] Add telemetry dashboards/alerts for queue depth, replay success rate, permanent failures, and sync delay.
- [ ] Document rollback procedure (disable queue/sync safely without losing online writes).

## 9) Final verification gate (must pass)
- [ ] `git status --short` clean except intended files.
- [ ] Backend + frontend builds pass.
- [ ] Targeted reliability/offline test suites pass.
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
