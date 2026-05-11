---
id: TASK-64
title: Add multi-event scoping to score governance page
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 23:00'
updated_date: '2026-05-11 01:44'
labels:
  - frontend
  - score-governance
  - scoping
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow users assigned to multiple events to choose an event and scope visible contests, categories, judges, and related governance data accordingly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The score governance page shows an event selector for users who can access multiple events, and hides or defaults it predictably for single-event users.
- [x] #2 Contest, category, judge, and related governance data are filtered by the selected event so users do not see cross-event options or records.
- [x] #3 Changing the selected event updates dependent selectors and results consistently without stale data leaking between scopes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add event-aware state to the score governance page: load available events, show an event selector only when multiple events are in scope, filter the contest selector by event, reset dependent contest/category/contestant selections on event change, and thread eventId through existing URL/query-param behavior.
2. Extend governance data queries to include eventId where needed: update frontend score review/request fetches and request creation payloads, then update controller/service filter handling so review rows and governance requests are constrained by the selected event without bypassing existing role-based scope rules.
3. Tighten judge option scoping so the request form no longer offers cross-event judges: either derive judge choices from event-scoped review rows or add an event-aware source if the existing assignments endpoint stays too broad.
4. Run focused verification for event switching, dependent selector resets, and request/review filtering, then record any follow-on gaps for deductions or auditor surfaces instead of folding them into this task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reviewed current score governance page and service filters.
- Confirmed the page lacks event state today, request/review APIs ignore eventId, and judge options currently come from a tenant-wide assignments source.

- Replaced tenant-wide contest/category/judge option sources on the score governance page with governance-review-derived event, contest, category, contestant, and judge scope options.
- Added eventId handling end-to-end across governance review/request filters, notification deep links, and request creation payloads.
- Added focused unit coverage for service event scoping and controller eventId forwarding.
- Verification: npx jest tests/unit/services/ScoreGovernanceService.test.ts tests/unit/controllers/scoreGovernanceController.test.ts --runInBand; cd frontend && npm run type-check; npm run build; cd frontend && npm run build
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented multi-event scoping on the score governance page so multi-event users can narrow governance data by event before drilling into contests, categories, contestants, and judges.

Changes:
- Added event-aware page state and filter controls, with automatic single-event defaulting and dependent selector resets to prevent stale contest/category/contestant/judge/score selections.
- Replaced tenant-wide governance option sources with scope-aware review-row derivation so selector choices stay aligned with the user's accessible governance data.
- Threaded eventId through score governance frontend API calls, controller filter parsing, request query filtering, score review filtering, and governance notification deep links.
- Added focused unit tests for score review event filtering and controller forwarding of eventId into governance review/request service calls.

Verification:
- npx jest tests/unit/services/ScoreGovernanceService.test.ts tests/unit/controllers/scoreGovernanceController.test.ts --runInBand
- cd frontend && npm run type-check
- npm run build
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
