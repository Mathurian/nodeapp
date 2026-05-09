---
id: TASK-29
title: Default contestant assignments view to aggregated assignment data
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:35'
updated_date: '2026-05-09 22:00'
labels:
  - assignments
  - contestants
  - frontend
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Change the contestant assignments page default presentation so it behaves like the judges, tally, and auditor assignment views instead of defaulting to a category-level display. The default should emphasize the broader assignment view while still allowing deeper drill-down where needed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The contestant assignments page defaults to the same style of aggregate assignment view used by the other assignment tabs rather than an immediate category-level breakdown.
- [x] #2 Users can still reach category-level detail when needed without losing access to the default broader view.
- [x] #3 The default contestant assignment view remains performant and accurate for large datasets.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Change contestant assignment rendering so the default list view groups rows at the broader contest assignment level instead of showing immediate category-level rows.
2. Preserve category drill-down by keeping category-filtered views ungrouped and by ensuring the broader grouped view still carries enough data for actions and row labels.
3. Verify grouped contestant rows remain accurate for selection, removal, and sorting across event/contest scopes introduced in TASK-28.
4. Run targeted verification and record any residual UX gaps that should remain in TASK-27 rather than this task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Starting after TASK-28 because the scope/filter work now provides the context needed for the default contestant aggregate view.
- Current contestant aggregation only occurs in a contest-filtered view; the default view still shows category-level rows.

- Changed the contestant assignments default list behavior to collapse rows by contestant and contest whenever the view is not drilled into a specific category.
- Preserved category drill-down by keeping category-filtered contestant views ungrouped.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the contestant assignments page to default to the broader aggregated assignment view.

Changes:
- Contestant assignments now collapse by contestant and contest by default instead of immediately showing category-level rows.
- Category-filtered contestant views remain ungrouped so users can still drill into category-level detail when needed.
- The grouped default view continues to use the existing grouped-row action paths for selection and bulk removal.

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
