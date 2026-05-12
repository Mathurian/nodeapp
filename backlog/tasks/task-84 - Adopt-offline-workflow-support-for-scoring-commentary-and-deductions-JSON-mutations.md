---
id: TASK-84
title: >-
  Adopt offline workflow support for scoring, commentary, and deductions JSON
  mutations
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-12 16:43'
updated_date: '2026-05-12 17:55'
labels: []
milestone: m-0
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adopt the shared offline framework for JSON-based scoring workflows so score entry, commentary, and deduction requests can be drafted locally, queued under interruption, restored after restart, and synced automatically when connectivity returns.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Score entry supports durable local draft restore and queued offline submission with clear pending-sync UI states.
- [ ] #2 Commentary updates support durable local draft restore and queued offline submission with clear pending-sync UI states.
- [ ] #3 Deduction request creation supports offline draft persistence, queued submission, and scoped restore after refresh/restart.
- [ ] #4 Queued score/commentary/deduction operations replay in causal order and do not falsely present server confirmation before acknowledgement.
- [ ] #5 Focused verification covers interruption, restart recovery, reconnect sync, and partial-success behavior for these JSON workflows.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor `frontend/src/pages/ScoringPage.tsx` so score form state and category-level commentary are persisted into the shared draft store keyed by active workflow scope, then restore that draft state automatically on reload/reopen before any server-backed data is resubmitted.
2. Replace the current page-local queue assumptions in Scoring with the shared outbox contract: preserve existing mutation reliability behavior, surface queued/pending-sync state through the shared infrastructure, and ensure replayed score/commentary writes never imply server confirmation before acknowledgement.
3. Extend `frontend/src/pages/DeductionsPage.tsx` to use the shared offline framework for request creation, including durable draft persistence for the form, queued offline submission, restore after refresh/restart, and correct scope/owner metadata for replay.
4. Tighten ordering and restore behavior for these JSON workflows so draft state, queued writes, and server refreshes do not overwrite each other incorrectly, and so resumed sessions remain consistent after reconnect.
5. Run focused verification for interruption, restart recovery, reconnect sync, and partial-success behavior on scoring, commentary, and deductions, then document any remaining implementation gaps that belong to `TASK-85` or later.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
