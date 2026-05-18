---
id: TASK-96.4
title: Scope DELEGATE scoring workspace by active delegation grants
status: Done
assignee:
  - '@codex'
created_date: '2026-05-18 19:43'
updated_date: '2026-05-18 20:16'
labels: []
dependencies: []
parent_task_id: TASK-96
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tighten the DELEGATE scoring experience so users without active grants do not browse broad scoring scope, and granted delegates only see the event, contest, category, and represented-judge options covered by current delegation grants.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A DELEGATE user without an active applicable grant does not see broad event, contest, or category scoring scope and is guided toward the missing-grant state.
- [x] #2 A DELEGATE user with active grants only sees the events, contests, categories, and represented judges covered by those grants.
- [x] #3 Delegated scoring remains functional for valid grants, including score entry, score-file usage, and delegated certification when separately allowed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add backend grant-scoped scoring context for DELEGATE users so scoring category reads fail closed to active delegation scope instead of using the normal broad scoring category path.
2. Restrict the scoring workspace data flow for DELEGATE: event, contest, category, and represented-judge options should only come from active grant coverage, and a delegate with no active applicable grant should receive an explicit empty-state contract.
3. Update the Scoring page to consume that contract, hide broad scoring browse options for DELEGATE users, and show clear guidance when no active delegation grants are available while preserving valid delegated score entry, score-file usage, and delegated certification flows.
4. Add focused regression coverage for no-grant delegates and granted delegates, then verify with backend/frontend build plus targeted tests before redeploying.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added DELEGATE-specific scoring category scoping in the scoring controller using active delegation grant scope from ScoreDelegationService.
- Updated ScoringPage to show an explicit no-active-grant empty state instead of broad scoring browse options for grantless delegates.
- Added focused controller coverage for no-grant and scoped-grant DELEGATE category reads.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Scoped the DELEGATE scoring workspace by active delegation grants instead of broad scoring reads.

Changes:
- Added active-grant scoring scope resolution in ScoreDelegationService and applied it in ScoringController so DELEGATE users without active grants receive an empty scoring category feed.
- Updated ScoringPage to show a deliberate no-active-grant empty state and stop implying broad scoring browse access for grantless delegates.
- Added focused controller coverage for no-grant and scoped-grant DELEGATE category reads.

Verification:
- npx jest tests/unit/controllers/scoringController.test.ts -t "getCategories" --runInBand
- npm run build
- cd frontend && npm run type-check
- cd frontend && npx eslint src/pages/ScoringPage.tsx
- cd frontend && npm run build

Deployment:
- Released to production via the standard stage/activate scripts as release 20260518151453.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
