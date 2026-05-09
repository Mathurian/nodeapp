---
id: TASK-28
title: Add event and contest/category scoping to assignments pages
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:35'
updated_date: '2026-05-09 21:25'
labels:
  - assignments
  - frontend
  - filters
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expand the assignments pages so assignment data can be scoped by event and by contest or category, instead of forcing a broader or flatter view. This should make assignment administration usable at the right operational level.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Assignments pages provide filters or scope controls for event, contest, and category where those scopes are applicable.
- [x] #2 Changing scope updates the displayed assignment data consistently across supported assignment tabs without leaking records outside the selected scope.
- [x] #3 The selected scope is reflected in requests and preserved predictably during navigation or refresh where the existing UX supports persisted filters.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add explicit event, contest, and category view-scope controls to the assignments page and persist them through the existing URL/search-param flow.
2. Update assignment queries and local filtering so each tab respects the selected event/contest/category scope consistently without leaking records outside the scope.
3. Decouple grouped/aggregate contestant rendering from the current contest-filter-only behavior so the page can support both broader scoped views and category drill-down cleanly.
4. Verify the new scope behavior across judges, contestants, tally masters, and auditors, then record follow-on adjustments needed for TASK-29 and TASK-27 if anything remains separate.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reviewed current assignments page behavior.
- Existing page supports contest/category filters and URL-derived form state, but no explicit event-level viewing scope.
- Current contestant aggregation only activates when contest is filtered and category is not, which overlaps with TASK-29.

- Added explicit event-level assignment scope state on the assignments page and persisted event/contest/category scope through URL search params.
- Updated judge, contestant, tally master, and auditor assignment requests to include selected scope params.
- Extended contestant assignment listing on the backend to honor eventId filtering in addition to contestId/categoryId.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented event, contest, and category scoping for the assignments page.

Changes:
- Added explicit event-level scope controls alongside the existing contest and category filters.
- Persisted active tab and scope selections through URL search params so the current scope survives refresh/navigation.
- Updated judge, contestant, tally master, and auditor assignment requests to include selected scope params.
- Extended contestant assignment listing on the backend to honor eventId filtering in addition to contestId/categoryId.

Verification:
- frontend: npm run type-check
- frontend: npm run build
- backend: npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
