---
id: TASK-69
title: Fix bios page default all-contests-in-event scoping
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 23:01'
updated_date: '2026-05-11 02:54'
labels:
  - bios
  - frontend
  - scoping
  - bug
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Correct the shared Bios page behavior so when an event is selected and the secondary selector defaults to all contests in event, the page shows accurate user data for that scope instead of misleading or incomplete results.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 When an event is selected on the shared Bios page and the secondary selector is all contests in event, the returned contestant, judge, and related user data accurately reflects that full event scope.
- [x] #2 Default selector behavior after choosing an event is predictable and does not imply broader or narrower data than what is actually displayed.
- [x] #3 Focused verification covers the event-level all-contests bios case so the shared scoping flow remains reliable for affected roles.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Fix the shared bio-directory backend scope logic for event-only selection: replace the current tenant-wide broad-role fallback in getBioDirectory() with event/contest-linked inclusion rules so contestants, judges, and scoped staff bios all reflect the selected event, including RoleAssignment-based scoping for BOARD/TALLY_MASTER/AUDITOR.
2. Update BiosPage tab behavior so the visible role tabs and empty states match the returned scoped dataset, preventing the event + All Contests state from implying tenant-wide staff coverage when only event-linked bios are supported.
3. Add focused service-level verification for the event-scoped all-users branch and run targeted frontend/backend checks so the All Contests in Event path is reliable before closing the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Fixed the shared bio-directory scope logic in BioService so event/contest filtering no longer leaks tenant-wide broader-role bios through the allUsers branch.
- Replaced the old broad-role fallback with event/contest-linked inclusion rules for scoped staff roles via RoleAssignment (BOARD, TALLY_MASTER, AUDITOR), while contestants and judges continue to scope by contest/event relationships.
- Corrected allUsers scope precedence so contestId wins over eventId when both are present, matching how the Bios page sends filters after a contest is selected.
- Updated BiosPage role tabs to hide empty broader-role tabs when a scoped event/contest filter is active and to reset the active tab if the current tab falls out of scope.
- Verification: npx jest tests/unit/services/BioService.test.ts --runInBand; npm run build; cd frontend && npm run type-check; cd frontend && npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the shared Bios page with event/contest scope semantics so "All Contests in Event" no longer mixes in unrelated tenant-wide staff bios.

Changes:
- Updated BioService.getBioDirectory() to remove the tenant-wide broad-role fallback under scoped filters and instead include broader staff bios only when they are linked to the selected scope through scoped BOARD/TALLY_MASTER/AUDITOR role assignments.
- Corrected filter precedence so contest-specific bios queries stay contest-scoped even when the frontend also sends the parent eventId.
- Updated the Bios page tab list to hide empty broader-role tabs during scoped browsing and to fall back to a valid tab if the current tab disappears.
- Added focused unit coverage for event-scoped broader-role filtering and contest-over-event precedence in BioService.

Verification:
- npx jest tests/unit/services/BioService.test.ts --runInBand
- npm run build
- cd frontend && npm run type-check
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
