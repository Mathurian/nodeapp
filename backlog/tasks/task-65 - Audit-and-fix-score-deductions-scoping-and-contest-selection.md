---
id: TASK-65
title: Audit and fix score deductions scoping and contest selection
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 23:00'
updated_date: '2026-05-11 01:46'
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
- [ ] #1 The score deductions flow exposes event selection where users can operate across multiple events, and downstream contest or category options are scoped to the selected event.
- [ ] #2 The current production behavior blocking contest selection for a1@okckinkweekend.com is reproduced or ruled out, and the task documents whether it is expected authorization behavior or a bug.
- [ ] #3 If the contest selection behavior is a bug, the fix restores predictable contest selection without widening access beyond the user’s allowed scope.
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
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
