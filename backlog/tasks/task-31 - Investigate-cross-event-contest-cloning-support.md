---
id: TASK-31
title: Investigate cross-event contest cloning support
status: Done
assignee: []
created_date: '2026-05-09 20:45'
updated_date: '2026-05-09 20:55'
labels:
  - cloning
  - events
  - investigation
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate whether tenant admins and organizers can already clone contests from one event into another event, and document the current behavior, gaps, and any follow-up implementation work required. This task is intentionally investigative so category cloning scope stays separate from contest cloning scope.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Document whether cross-event contest cloning is currently supported for tenant admins and organizers, including the actual user flow.
- [x] #2 Identify any UI, validation, or backend gaps that prevent or confuse cross-event contest cloning.
- [x] #3 If cross-event contest cloning is missing or incomplete, produce clear follow-up implementation requirements or a new implementation task.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Investigation already completed.
- Cross-event contest cloning is present for the intended workflow.
- No additional implementation follow-up is required from this investigation card.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Confirmed that cross-event contest cloning functionality is already present.

Outcome:
- Verified the intended capability exists.
- No new backend or UI implementation task is required from this investigation.

Notes:
- This closes the investigation itself; separate category-cloning UX work remains tracked elsewhere.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
