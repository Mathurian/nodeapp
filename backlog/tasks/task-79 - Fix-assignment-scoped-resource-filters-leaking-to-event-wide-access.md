---
id: TASK-79
title: Fix assignment-scoped resource filters leaking to event-wide access
status: Done
assignee:
  - '@codex'
created_date: '2026-05-12 00:49'
updated_date: '2026-05-12 01:33'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the scope-aware permissions v1 regression where assignment-scoped users can see event-wide data when shared scope filters OR together event, contest, and category bounds. The immediate user-visible bug is Judge Scoring showing all contests in an event for an assigned judge.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Assignment-scoped shared scope resolution does not include event-wide access when a user only has contest/category assignments.
- [x] #2 Judge Scoring category/contest visibility remains limited to assigned contests/categories for judge users.
- [x] #3 Focused regression coverage is added for the shared scope resolver or the scoring flow.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm the live regression source in shared assignment scope resolution and identify all first-wave consumers affected by eventIds being included for assignment scope.
2. Patch the shared PermissionScopeService so assignment scope only includes explicit event-wide rows, while contest/category assignments remain narrow.
3. Add focused regression coverage for the shared scope resolver and verify the judge scoring path still receives assigned-contest-only scope.
4. Run targeted tests and, if clean, deploy the fix for immediate retest.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Confirmed live judge regression came from assignment-scoped resolved scopes still carrying eventIds, which widened OR filters to all contests in the event.
- Patched PermissionScopeService so assignment scope only keeps eventIds for explicit event-level assignment rows; contest/category assignments now remain narrow.
- Added focused unit coverage in tests/unit/services/PermissionScopeService.test.ts for judge contest/category scope and explicit event-level assignment preservation.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed an assignment-scope leak in the shared PermissionScopeService that was widening assignment-scoped users to event-wide access whenever downstream filters ORed event, contest, and category bounds together.

Changes:
- Updated shared scope resolution so assignment scope only keeps eventIds for explicit event-level assignment rows; ordinary contest/category assignments now stay limited to their assigned contests/categories.
- Added focused regression coverage in tests/unit/services/PermissionScopeService.test.ts for judge assignment scope and event-level tally assignment preservation.
- Deployed release 20260511195619 for live retesting.

Impact:
- Judge Scoring contest/category visibility no longer expands to all contests in the event for assigned judges.
- The same leak pattern is prevented for other first-wave consumers that rely on the shared scope resolver.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
