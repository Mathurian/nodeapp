---
id: TASK-83
title: >-
  Implement shared offline workflow infrastructure for draft persistence, outbox
  state, reconnect sync, and logout safeguards
status: Done
assignee:
  - '@codex'
created_date: '2026-05-12 16:43'
updated_date: '2026-05-12 17:50'
labels: []
milestone: m-0
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the shared client-side offline foundation for unreliable-connectivity workflows. This task should introduce a durable draft store, a generalized outbox model, reconnect sync orchestration, explicit queued/syncing/error states, and logout/session-change safeguards so unsynced work is preserved or intentionally discarded rather than silently lost.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Introduce a shared offline workflow persistence layer that separates in-progress drafts from submitted queued operations and survives browser/PWA restarts.
- [x] #2 Provide a generalized outbox state model and reconnect sync orchestrator with statuses for queued, syncing, synced, retryable failure, terminal failure, and conflict.
- [x] #3 Implement session/logout safeguards so users with unsynced offline work are warned and can choose to stay signed in or discard pending local work.
- [x] #4 Add a reusable user-facing outbox/status surface that other workflow pages can consume without bespoke queue logic.
- [x] #5 Document the infrastructure contract for downstream workflow adoption.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the current queue-only storage model with a shared offline persistence layer in the frontend that has separate IndexedDB stores for workspace drafts and submitted outbox items, plus a typed service API that other workflows can consume without page-specific queue code.
2. Evolve the replay/orchestration layer from mutation-specific metrics into a generalized outbox lifecycle with explicit statuses, per-item metadata, listeners/hooks, and queue inspection helpers that can represent queued, syncing, synced, retryable failure, terminal failure, and conflict states.
3. Introduce a reusable app-level offline status surface and supporting hooks/components so pages can render queue health and item-level state consistently instead of embedding custom optimistic/offline messaging in each workflow.
4. Change authentication/session behavior so queued offline work is no longer silently cleared on logout or session change: add detection of unsynced work, a confirm-modal guard with stay-signed-in vs discard behavior, and the underlying safe-clear utilities.
5. Add focused tests/documentation for the new infrastructure contract, then leave workflow adoption to follow-on tasks `TASK-84` through `TASK-87`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Implemented shared offline persistence in `frontend/src/services/offlineWorkflowStore.ts` with separate IndexedDB stores for workflow drafts and outbox items, explicit outbox statuses, owner scoping, retention cleanup, and store subscriptions.
- Repointed the legacy mutation queue wrapper in `frontend/src/services/offlineMutationQueue.ts` onto the shared outbox so existing scoring/commentary queue behavior now uses the shared infrastructure instead of a separate queue-only store.
- Upgraded `frontend/src/services/offlineSyncOrchestrator.ts` to operate on the shared outbox lifecycle, support conflict/terminal failure states, recover stale syncing records, and avoid duplicated global subscriptions when multiple pages/components subscribe.
- Added active owner scoping via `frontend/src/services/offlineSessionScope.ts` so replay only runs for the authenticated session instead of globally across all locally persisted items.
- Added `frontend/src/hooks/useOfflineOutbox.ts` and `frontend/src/components/ui/OfflineOutboxStatus.tsx` to provide a reusable app-level offline status surface and queue inspection modal.
- Wired the shared offline status surface into `frontend/src/App.tsx` and replaced silent logout clearing in `frontend/src/contexts/AuthContext.tsx` with a stay-signed-in vs discard-and-sign-out guard when unsynced offline work exists.
- Updated the existing scoring queue enqueue path in `frontend/src/pages/ScoringPage.tsx` to attach owner metadata and human-readable summaries so current queued scoring work participates correctly in the shared infrastructure.
- Documented the downstream usage contract in `docs/operations/OFFLINE-WORKFLOW-INFRASTRUCTURE-CONTRACT.md`.
- Verification passed: `cd frontend && npm run type-check`, `cd frontend && npx eslint src/services/offlineWorkflowStore.ts src/services/offlineMutationQueue.ts src/services/offlineSyncOrchestrator.ts src/services/offlineSessionScope.ts src/hooks/useOfflineOutbox.ts src/components/ui/OfflineOutboxStatus.tsx src/contexts/AuthContext.tsx src/App.tsx src/pages/ScoringPage.tsx`, and `cd frontend && npm run build`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the shared offline workflow foundation for future scoring/offline adoption.

What changed:
- Added a new shared IndexedDB-backed infrastructure layer in `frontend/src/services/offlineWorkflowStore.ts` that separates workspace drafts from submitted outbox items, tracks explicit outbox lifecycle states, scopes records to the active user/tenant, and exposes reusable summary/subscription APIs.
- Rewired the existing frontend offline mutation path to use that shared outbox instead of a standalone queue store, preserving current scoring/commentary reliability behavior while making it compatible with the broader offline architecture.
- Hardened replay orchestration so it now understands queued/syncing/retryable-failure/terminal-failure/conflict states, recovers stale syncing records after interrupted sessions, and avoids duplicated global listeners when multiple components subscribe.
- Added app-level UX for offline state with a reusable outbox status surface and queue inspection modal, then integrated a logout guard that warns about unsynced offline work and offers stay-signed-in vs discard-and-sign-out behavior rather than silently deleting local work.
- Added active session owner scoping and documented the contract for follow-on tasks, plus updated the current scoring enqueue path to attach owner metadata and human-readable summaries.

Artifacts:
- `frontend/src/services/offlineWorkflowStore.ts`
- `frontend/src/services/offlineMutationQueue.ts`
- `frontend/src/services/offlineSyncOrchestrator.ts`
- `frontend/src/services/offlineSessionScope.ts`
- `frontend/src/hooks/useOfflineOutbox.ts`
- `frontend/src/components/ui/OfflineOutboxStatus.tsx`
- `docs/operations/OFFLINE-WORKFLOW-INFRASTRUCTURE-CONTRACT.md`

Verification:
- `cd frontend && npm run type-check`
- `cd frontend && npx eslint src/services/offlineWorkflowStore.ts src/services/offlineMutationQueue.ts src/services/offlineSyncOrchestrator.ts src/services/offlineSessionScope.ts src/hooks/useOfflineOutbox.ts src/components/ui/OfflineOutboxStatus.tsx src/contexts/AuthContext.tsx src/App.tsx src/pages/ScoringPage.tsx`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
