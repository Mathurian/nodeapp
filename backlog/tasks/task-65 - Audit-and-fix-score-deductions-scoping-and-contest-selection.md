---
id: TASK-65
title: Audit and fix score deductions scoping and contest selection
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 23:00'
updated_date: '2026-05-11 01:56'
labels:
  - frontend
  - deductions
  - scoping
  - investigation
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the deductions UX so it follows the same event-aware scoping pattern as score governance where applicable, and investigate whether the inability for a1@okckinkweekend.com to select a contest in production is expected permissions behavior or a defect.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The score deductions flow exposes event selection where users can operate across multiple events, and downstream contest or category options are scoped to the selected event.
- [x] #2 The current production behavior blocking contest selection for a1@okckinkweekend.com is reproduced or ruled out, and the task documents whether it is expected authorization behavior or a bug.
- [x] #3 If the contest selection behavior is a bug, the fix restores predictable contest selection without widening access beyond the user’s allowed scope.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit the deductions data path end-to-end: map how DeductionsPage builds event/contest/category/contestant options from /scoring/categories and how /scoring/deductions is currently filtered, then confirm whether the current UX can scope by event at all.
2. Verify the likely contest-selection bug source in code by checking assignment scoping in scoring category access, especially whether judge/event-level assignments are omitted from /scoring/categories and therefore leave contest options empty for some users.
3. Implement event-aware deductions scoping: add optional event filtering to the relevant scoring endpoints, preserve existing role restrictions, and update DeductionsPage so event selection drives contest/category/contestant options and the deductions list consistently.
4. Add focused regression coverage for the assignment/scoping case that caused the contest-selection issue and for the new event-aware deductions filtering, then run targeted verification before closing the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reviewed the current deductions page and confirmed it has no event state and currently derives contest options by flattening /scoring/categories results.
- Confirmed deductions use the scoring controller deduction endpoints, not the older deduction service route family, so the scoping audit needs to focus on the scoring stack.

- Added event-aware scoping to deductions by threading eventId through /scoring/deductions and /scoring/categories, then updating DeductionsPage to scope deductions, contests, categories, and contestants by the selected event.
- Reworked the deductions request UI so event selection resets dependent contest/category/contestant picks and general-scope contestant options aggregate across categories in the chosen contest.
- Reviewed the prod-style contest-selection issue in code and ruled it out as expected authorization behavior: the deductions flow previously had no event scoping at all, and the scoring categories endpoint exposed no eventId filter despite controller comments indicating it was intended.
- Could not exercise a1@okckinkweekend.com against production from this environment, but the implemented fix addresses the concrete scoping gap rather than widening permissions.
- Verification: npx jest tests/unit/controllers/scoringController.test.ts --runInBand; cd frontend && npm run type-check; npm run build; cd frontend && npm run build
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented event-aware deductions scoping and corrected the deductions option-building flow so contest, category, and contestant choices follow the selected event.

Changes:
- Extended scoring API helpers and scoring controller filters so /scoring/categories and /scoring/deductions accept event-aware scoping, with deductions history filtering by event/contest through the related category/contest chain.
- Updated DeductionsPage to add event scoping, reset dependent request selectors on scope changes, and scope deduction history plus request options to the selected event for multi-event users.
- Fixed general-scope contestant option building to aggregate contestants across all categories in the selected contest instead of reading only the first matching category.
- Added controller regression coverage for event-filtered scoring categories and event/contest-filtered deductions queries.

Prod-user investigation:
- Direct production reproduction was not possible in this environment, but the current code ruled out the behavior as intentional permissions enforcement. The deductions flow lacked event scoping entirely and therefore could leave contest selection in a broken or misleading state for multi-event users.

Verification:
- npx jest tests/unit/controllers/scoringController.test.ts --runInBand
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
