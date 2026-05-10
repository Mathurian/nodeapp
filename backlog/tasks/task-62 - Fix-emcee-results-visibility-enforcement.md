---
id: TASK-62
title: Fix emcee results visibility enforcement
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 21:41'
updated_date: '2026-05-10 22:01'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the regression where emcees can still see or directly access View Results despite the intended visibility restrictions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Emcee users do not see the View Results navigation item when policy should hide it.
- [x] #2 Emcee users cannot directly access the View Results page or API when policy should deny it.
- [x] #3 Authorized roles retain expected access to the results experience after the fix.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Align the published-results default policy so EMCEE is not included in detailed results visibility unless explicitly configured.\n2. Add direct /results page enforcement on the frontend so users whose tenant policy denies detailed results cannot open the page even by URL.\n3. Keep winners/progress access intact, verify nav hiding plus direct-page denial for emcees, and re-run targeted frontend/backend checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed EMCEE from the backend default detailed-results visibility set so tenants no longer grant emcee detailed results implicitly without explicit configuration or event override.

Added a shared frontend results-scope hook and used it to hide the View Results nav item when restricted roles have no accessible detailed-results scope, which preserves event-level overrides instead of relying on tenant defaults alone.

Updated ResultsPage to deny direct access for restricted roles when the effective results scope is empty, while leaving winners/progress access and authorized results access intact.

Verified with npx jest tests/unit/services/ResultsService.test.ts --runInBand, npm run build, cd frontend && npm run type-check, and cd frontend && npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed emcee detailed-results visibility enforcement so the UI and direct page access now follow the same effective results-scope rules.\n\nChanges:\n- Removed EMCEE from the backend default detailed-results visibility roles, so detailed results are no longer granted implicitly without explicit tenant or event configuration.\n- Added a shared frontend results-scope hook and used it in navigation filtering so restricted roles only see View Results when they actually have accessible detailed-results scope.\n- Updated ResultsPage to deny direct access for restricted roles when the effective scope is empty, preserving event-level overrides and leaving winners/progress behavior unchanged.\n- Added backend regression coverage to lock the default emcee-denied behavior in ResultsService.\n\nVerification:\n- npx jest tests/unit/services/ResultsService.test.ts --runInBand\n- npm run build\n- cd frontend && npm run type-check\n- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
