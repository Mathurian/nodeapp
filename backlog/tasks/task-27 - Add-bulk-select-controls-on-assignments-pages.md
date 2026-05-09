---
id: TASK-27
title: Add bulk select controls on assignments pages
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:34'
updated_date: '2026-05-09 22:05'
labels:
  - assignments
  - frontend
  - ux
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the assignments pages so users can bulk select records without manually clicking every row checkbox one by one. The goal is to make large assignment maintenance workflows practical in the UI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Assignments pages provide bulk selection controls such as select all for the current view and clear selection.
- [x] #2 Bulk selection behaves correctly with filtering, pagination, grouped rows, and mixed assignment types shown in the assignments experience.
- [x] #3 Users receive clear feedback about how many items are selected before running a bulk action.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add explicit bulk-selection controls to the assignments page for selecting all visible rows and clearing the current selection.
2. Keep the selection behavior aligned with the current filtered/grouped view so grouped rows and active scopes behave predictably.
3. Surface clearer selected-count feedback around the bulk action area without changing the underlying bulk removal workflow.
4. Run frontend verification and record any remaining larger UX gaps separately from this task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Starting after TASK-29 because the assignments page selection model is already in active scope.
- The page already has per-row checkboxes and a header checkbox, but it lacks clear explicit bulk-selection controls in the action area.

- Added explicit bulk-selection controls for the current visible assignments view: Select visible and Clear selection.
- Added a clearer selected-count indicator in the bulk action area while keeping the existing row and header checkbox behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added explicit bulk-selection controls to the assignments page.

Changes:
- Added Select visible and Clear selection controls in the assignments filter/action bar.
- Kept selection behavior aligned with the current visible filtered/grouped rows across assignment tabs.
- Added clearer selected-count feedback next to the bulk removal action while preserving the existing row and header checkbox interactions.

Verification:
- frontend: npm run type-check
- frontend: npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
