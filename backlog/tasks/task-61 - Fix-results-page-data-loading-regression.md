---
id: TASK-61
title: Fix results page data loading regression
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 21:41'
updated_date: '2026-05-10 21:50'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the regression where the View Results page does not load the proper results data for authorized users after the latest visibility-policy release.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Authorized users can load the results page and receive the expected event, contest, category, and results data.
- [x] #2 The fix preserves published-results visibility restrictions for roles that should remain gated.
- [x] #3 Regression coverage or targeted verification demonstrates the results data path works after the fix.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace the current Results page loading path from frontend filters through /results/categories, /results/contest/:id, and /results/category/:id, and add focused regression coverage around the failing data path.
2. Refactor the Results page and/or results service contract so authorized users load event, contest, category, and result data from stable scoped sources instead of depending on a policy-sensitive category list for every filter state.
3. Verify the fix for privileged users and preserve published-results visibility restrictions for gated roles, then document the adjacent emcee route/nav issue under the separate tracking task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced the Results page's repeated /results/categories reconstruction path with a dedicated /results/scope-options contract that returns role-filtered events, contests, and categories in one response.

Added ResultsService.getScopeOptions() and route/controller wiring so authorized users load scope data from a stable results-specific source while keeping existing detailed results endpoints and visibility gates intact.

Verified with npx jest tests/unit/services/ResultsService.test.ts --runInBand, npm run build, cd frontend && npm run type-check, and cd frontend && npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the Results workspace data-loading regression by introducing a dedicated results scope endpoint and moving the frontend off its previous pattern of rebuilding event, contest, and category filters from repeated /results/categories calls.\n\nChanges:\n- Added ResultsService.getScopeOptions() plus controller/route wiring at /results/scope-options to return role-filtered events, contests, and categories in one stable response.\n- Updated ResultsPage to load filter data from that single endpoint and derive contest/category options locally, while leaving detailed results queries and published-results visibility enforcement unchanged.\n- Added service-level regression coverage for the new scope contract.\n\nVerification:\n- npx jest tests/unit/services/ResultsService.test.ts --runInBand\n- npm run build\n- cd frontend && npm run type-check\n- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
