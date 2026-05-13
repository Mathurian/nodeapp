---
id: TASK-84
title: >-
  Adopt offline workflow support for scoring, commentary, and deductions JSON
  mutations
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-12 16:43'
updated_date: '2026-05-13 04:48'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added scoring workspace draft restore and selection-preserving draft persistence in frontend/src/pages/ScoringPage.tsx.
- Added deductions request draft restore, debounced draft persistence, and retryable offline queueing in frontend/src/pages/DeductionsPage.tsx.
- Added /scoring/deductions to the shared offline ownership manifest source and telemetry mapping so queued deduction writes use the shared outbox contract.
- Verification passed: cd frontend && npm run type-check; cd frontend && npx eslint src/pages/ScoringPage.tsx src/pages/DeductionsPage.tsx src/services/api.ts src/services/offlineSyncTelemetry.ts; cd frontend && npm run build; npm run build.
- Remaining gap: no browser-level interruption/reconnect UAT has been run yet; task should stay in progress until deployed and exercised against real connectivity interruption scenarios.

- Patch applied after UAT: scoring and deductions now treat the shared outbox as enabled unless explicitly disabled (`VITE_OFFLINE_MUTATION_QUEUE_ENABLED !== "false"`), scoring draft persistence only retains actual unsynced local changes instead of untouched baseline selections, and the offline modal now shows stronger draft identity/resume affordances.
- Scoring now records contestant/category names inside restored draft metadata and announces the resumed draft context when it restores a saved scoring workspace.

- UAT on 2026-05-12 found a real scoring regression: while offline, submitting remaining scores surfaced "Sync failed - tap to retry" under the submit button and a toast of "Error submitting scores: Network Error" instead of queueing the submission for later sync.
- The same UAT confirmed draft persistence was working: after reconnect and refresh, the offline-entered scores were restored.
- UAT also exposed two UX problems: the global offline notice gave no contestant-level context for the saved scoring draft, and the Resume affordance in the offline modal was too visually subtle and easy to miss.
- Root cause isolated in code review: the scoring/deductions queue path was gated behind `VITE_OFFLINE_MUTATION_QUEUE_ENABLED === "true"`, so deployments without that explicit env value fell back to hard network failure despite the shared outbox infrastructure being present. Scoring drafts were also being persisted for untouched contestant/category selections, which caused a persistent stale "offline draft saved locally" notice.

- Deployed TASK-84 follow-up fix to production via release flow: staged `/opt/event-manager/releases/20260512201447`, activated it, and confirmed `/opt/event-manager/current` points to that release.
- Post-deploy validation passed: `systemctl is-active event-manager.service` => active; `curl -sS http://127.0.0.1:3000/health` => status OK with `offlineWriteManifest.valid=true` and `offlineReliabilityInvariants.valid=true`; `sudo nginx -t` => syntax ok/successful.

- Production UAT after release `20260512201447` still showed the old scoring failure path. Follow-up review found the deployment mistake: `stage-release.sh` packages the existing workspace build artifacts, and the frontend bundle had not been rebuilt after the TASK-84 source patch.
- Rebuilt the frontend production bundle (`cd frontend && npm run build`), confirmed new hashed assets including `ScoringPage-BE6eCv2T.js`, staged release `/opt/event-manager/releases/20260512202134`, activated it, and revalidated service health (`event-manager.service` active, `/health` OK).

- Follow-up production issue confirmed on 2026-05-12: the resumed-draft toast could spam continuously. Root cause was client-side, not queued-attempt volume: scoring and deductions draft autosave effects were rewriting the saved draft every cycle because each save changed `updatedAt`, and the scoring resume announcement keyed off that changing draft identity.
- Patched the draft persistence to skip no-op rewrites by comparing draft payload content excluding `updatedAt`, and changed the scoring resume announcement to key off stable contest/category/contestant selection identity instead of the mutable timestamp.

- Additional production UAT on 2026-05-12 exposed a second scoring defect after offline queueing started working: reconnect/retry flows could issue `PUT /scoring/optimistic-*` requests and receive 404s. Root cause was the scoring submit path reading optimistic React Query cache rows as if they were real persisted score records, then routing subsequent writes through update endpoints instead of create endpoints.
- Patch applied: scoring now ignores optimistic score rows when deciding whether to POST vs PUT, batched score/commentary queueing emits one offline toast per action instead of one per criterion, certification messaging now explicitly states that offline-scored work must sync before certifying, and the offline sync orchestrator prunes any already-corrupted `/scoring/optimistic-*` outbox items from the browser store.

- Production UAT on 2026-05-12 surfaced two remaining UI issues after conflict reconciliation: Pending Outbox still rendered recently synced rows as if they were pending, which made Sync Now report ineligible work, and Resume Scoring still landed at the top of /scoring instead of the restored score sheet context.
- Updated OfflineOutboxStatus to separate pending items from recently synced history, prefer human-readable queued summaries, show status badges based on actual outbox status, and disable Sync Now when only synced history remains.
- Updated ScoringPage resume handling to clear router state via window.history.replaceState instead of navigate(... replace), preserving the deep resume scroll/focus into the first score input.
- Verification: cd frontend && npx eslint src/components/ui/OfflineOutboxStatus.tsx src/pages/ScoringPage.tsx src/hooks/useOfflineOutbox.ts src/services/offlineSyncOrchestrator.ts; cd frontend && npm run type-check; cd frontend && npm run build.
- Deployed production release 20260512212032 and verified event-manager.service active plus /health status OK with offline manifest and invariants valid.

- Production UAT after release 20260512212032 showed Resume Scoring was fixed, but manual resubmission of restored scores still triggered live POST /scoring/category/:categoryId/contestant/:contestantId conflicts (HTTP 409) for every criterion. Root cause: submit-time create-vs-update branching still trusted stale client/query state after resume or offline replay completion.
- Updated ScoringPage submit flow to fetch authoritative server scores before deciding POST versus PUT and to refresh contestant score/commentary/attachment queries when offline queue metrics drain back to zero, so synced work no longer remains visually stale in the active scoring page.
- Verification: cd frontend && npx eslint src/pages/ScoringPage.tsx src/components/ui/OfflineOutboxStatus.tsx src/hooks/useOfflineOutbox.ts src/services/offlineSyncOrchestrator.ts; cd frontend && npm run type-check; cd frontend && npm run build.
- Deployed production release 20260512215032 and verified event-manager.service active plus /health status OK with offline manifest and invariants valid.

- Production UAT identified a rehydration race after offline sync success: once server-backed scores caught up, the local scoring draft could be deleted before refreshed contestant scores arrived, causing the score sheet to reinitialize from stale empty state and remain blank even though uncertified scores existed on the server.
- Updated ScoringPage to derive authoritative form state from refreshed server scores and rehydrate the score sheet/commentary when there is no restored draft and no remaining unsynced local state, preventing synced-but-uncertified scores from disappearing visually.
- Verification: cd frontend && npx eslint src/pages/ScoringPage.tsx; cd frontend && npm run type-check; cd frontend && npm run build.
- Deployed production release 20260512222346 and verified event-manager.service active plus /health status OK with offline manifest and invariants valid.

- Production UAT showed judge certification could still fail with POST /scoring/category/:categoryId/certify HTTP 400 after a single-contestant submit, because backend certification is category-wide for the judge while the frontend opened the signature modal as if certification were contestant-scoped.
- Updated scoring category payloads for judges to include judgeCoverage { expected, submitted, isComplete } and updated ScoringPage to refresh that coverage after score submission. If the judge has not finished the whole category, the page now saves the scores and shows a clear completion message instead of opening a signature modal that will fail on certify.
- Verification: cd frontend && npx eslint src/pages/ScoringPage.tsx; cd frontend && npm run type-check; cd frontend && npm run build; npm run build.
- Deployed production release 20260512224109 and verified event-manager.service active plus /health status OK with offline manifest and invariants valid.

- Corrected a regression from release 20260512224109 after UAT clarified that judges certify one contestant within a category at a time, not the entire category at once. Reverted the frontend category-wide certification gate and updated certify requests to include contestantId for the active scoring selection.
- Updated backend category certification to accept optional contestantId, validate score completeness only for that contestant when provided, certify only that contestant's rows, and only advance judge category-stage metadata once no uncertified score rows remain for that judge/category.
- Hardened Resume Scoring by turning the deep-link jump into a bounded retry loop that waits for the first score input to exist before considering the resume handoff complete, reducing the intermittent top-of-page fallback.
- Verification: cd frontend && npx eslint src/pages/ScoringPage.tsx src/services/api.ts; cd frontend && npm run type-check; cd frontend && npm run build; npm run build.
- Deployed production release 20260512231139 and verified event-manager.service active plus /health status OK with offline manifest and invariants valid.

- Release 20260512231139 regressed score visibility during production UAT after the contestant-scoped certification/resume changes. To stop churn in production, rolled active release back to 20260512222346, which was the last known-good release for synced score visibility.
- Rollback verification: event-manager.service active; /health status OK; /opt/event-manager/current -> /opt/event-manager/releases/20260512222346.
- Follow-up: rework contestant-scoped certification and resume reliability off the rolled-back production baseline before redeploying.

- Production UAT after rollback still showed two scoring regressions: existing synced scores could remain blank in the UI because the form initialized before contestant score fetch completion and then treated the blank state as local edits, and contestant auto-scroll often required a second click because the scroll fired before the criteria section mounted.
- Updated ScoringPage to defer initial score-form hydration until contestant score fetch completes when no restored draft is present, track real local edits separately from query-state differences, and rehydrate from server scores/comments only when the judge has not interacted with the current selection. Also moved contestant auto-scroll into a post-selection effect so it runs after the score sheet is mounted instead of on the optimistic click path.
- Verification: cd frontend && npx eslint src/pages/ScoringPage.tsx src/services/api.ts; cd frontend && npm run type-check; cd frontend && npm run build; npm run build.
- Deployed production release 20260512232933 and verified event-manager.service active plus /health status OK with offline manifest and invariants valid.

- Production UAT on release 20260512232933 found two remaining scoring UX issues: recently synced outbox rows could still render raw endpoint paths when the item summary was absent, and Resume Scoring still intermittently landed at the top of the page.
- Updated OfflineOutboxStatus to format route-based fallback details for synced/queued items instead of exposing raw API paths, and updated scoring resume navigation to target /scoring#score-sheet. Reinforced ScoringPage resume behavior by scrolling the score sheet anchor while retrying input focus, so the resume flow no longer depends solely on an early-mounted first score input.
- Verification: cd frontend && npx eslint src/components/ui/OfflineOutboxStatus.tsx src/pages/ScoringPage.tsx src/services/api.ts; cd frontend && npm run type-check; cd frontend && npm run build; npm run build.
- Deployed production release 20260512234707 and verified event-manager.service active plus /health status OK with offline manifest and invariants valid.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
