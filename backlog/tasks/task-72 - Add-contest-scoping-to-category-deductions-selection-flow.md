---
id: TASK-72
title: Add contest scoping to category deductions selection flow
status: Done
assignee:
  - '@codex'
created_date: '2026-05-11 04:15'
updated_date: '2026-05-11 18:52'
labels: []
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adjust the deductions workflow so category selection is narrowed by contest selection instead of presenting all categories across all contests, improving the category deduction UX and reducing cross-contest noise.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When creating or filtering category-level deductions, users can select a contest before selecting a category.
- [x] #2 The category selector is scoped to the selected contest and no longer shows unrelated categories from other contests.
- [x] #3 Existing event scoping and user access rules in the deductions flow continue to work correctly after the UX change.
- [x] #4 The updated deductions selection flow is covered by focused frontend and/or backend verification.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor the deductions request form state so category-scope requests use an explicit contest selection before category selection, without regressing the existing general contest-level deduction flow.
2. Scope category options by the selected event and selected contest, and reset downstream category/contestant selections when scope inputs change so unrelated categories cannot remain selected.
3. Update the deductions page data fetching and derived option logic to preserve existing event scoping and access behavior while reducing category noise in the category deduction flow.
4. Run focused verification on the deductions page path and the related scoring API contract to confirm category scoping, contestant selection, and existing deductions access still behave correctly.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Separated request-scoped contest/category state from history-filter contest/category state in `frontend/src/pages/DeductionsPage.tsx`.
- Updated the deductions query to send `eventId`, `contestId`, and `categoryId` to `scoringAPI.getDeductions`, so history filters use backend scoping instead of only client-side status filtering.
- Refactored the request form so both deduction scopes select a contest first, with category requests unlocking a contest-scoped category selector only after a contest is chosen.
- Added a history filter card that narrows deduction history by contest before category and resets downstream selections when event or contest scope changes.
- Verification: `cd frontend && npm run type-check`, `cd frontend && npx eslint src/pages/DeductionsPage.tsx`, `cd frontend && npm run build`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the deductions workflow to be contest-first for category deductions and added contest/category history scoping on the page.

Changes:
- Split request selection state from history filter state in `frontend/src/pages/DeductionsPage.tsx` so the request form and deductions list can change scope independently.
- Scoped category choices to the selected contest for category deductions, while preserving the existing general contest-level deduction path.
- Wired the deductions query to the existing `scoringAPI.getDeductions` contest/category params and added a dedicated history filter card.
- Added downstream reset logic so changing event, contest, or category scope cannot leave stale category or contestant selections active.

Verification:
- `cd frontend && npm run type-check`
- `cd frontend && npx eslint src/pages/DeductionsPage.tsx`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
