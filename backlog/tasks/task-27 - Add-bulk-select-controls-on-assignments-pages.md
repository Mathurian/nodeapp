---
id: TASK-27
title: Add bulk select controls on assignments pages
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-09 20:34'
updated_date: '2026-05-09 22:00'
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
- [ ] #1 Assignments pages provide bulk selection controls such as select all for the current view and clear selection.
- [ ] #2 Bulk selection behaves correctly with filtering, pagination, grouped rows, and mixed assignment types shown in the assignments experience.
- [ ] #3 Users receive clear feedback about how many items are selected before running a bulk action.
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
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
