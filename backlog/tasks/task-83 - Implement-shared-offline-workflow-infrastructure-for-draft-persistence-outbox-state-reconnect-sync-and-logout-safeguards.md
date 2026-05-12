---
id: TASK-83
title: >-
  Implement shared offline workflow infrastructure for draft persistence, outbox
  state, reconnect sync, and logout safeguards
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-12 16:43'
updated_date: '2026-05-12 17:17'
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
- [ ] #1 Introduce a shared offline workflow persistence layer that separates in-progress drafts from submitted queued operations and survives browser/PWA restarts.
- [ ] #2 Provide a generalized outbox state model and reconnect sync orchestrator with statuses for queued, syncing, synced, retryable failure, terminal failure, and conflict.
- [ ] #3 Implement session/logout safeguards so users with unsynced offline work are warned and can choose to stay signed in or discard pending local work.
- [ ] #4 Add a reusable user-facing outbox/status surface that other workflow pages can consume without bespoke queue logic.
- [ ] #5 Document the infrastructure contract for downstream workflow adoption.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the current queue-only storage model with a shared offline persistence layer in the frontend that has separate IndexedDB stores for workspace drafts and submitted outbox items, plus a typed service API that other workflows can consume without page-specific queue code.
2. Evolve the replay/orchestration layer from mutation-specific metrics into a generalized outbox lifecycle with explicit statuses, per-item metadata, listeners/hooks, and queue inspection helpers that can represent queued, syncing, synced, retryable failure, terminal failure, and conflict states.
3. Introduce a reusable app-level offline status surface and supporting hooks/components so pages can render queue health and item-level state consistently instead of embedding custom optimistic/offline messaging in each workflow.
4. Change authentication/session behavior so queued offline work is no longer silently cleared on logout or session change: add detection of unsynced work, a confirm-modal guard with stay-signed-in vs discard behavior, and the underlying safe-clear utilities.
5. Add focused tests/documentation for the new infrastructure contract, then leave workflow adoption to follow-on tasks `TASK-84` through `TASK-87`.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
