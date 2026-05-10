---
id: TASK-60
title: Add event and contest scoping to shared bios directory
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 18:56'
updated_date: '2026-05-10 19:13'
labels:
  - bios
  - ux
  - scoping
  - emcee
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the canonical shared bios experience so users can scope the directory by event as well as contest, reducing noisy tenant-wide contest lists for emcees and other scoped roles while preserving the existing shared bios pattern.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The shared bios page supports selecting an event before or alongside contest selection, and the contest list is filtered to contests in the selected event.
- [x] #2 The shared bios directory request/response contract supports event-aware filtering so contestant, judge, and role-based bios shown in the page respect the selected event scope.
- [x] #3 Existing role-based scoping rules remain intact, including narrower judge/contestant visibility rules, while the new event filter improves UX for broader roles such as emcee.
- [x] #4 Focused verification is added for event plus contest bios filtering behavior.
- [x] #5 The shared bios event and contest scoping change does not break other end-user bios surfaces or role-specific bios views that already consume the canonical bios patterns.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the shared bio directory backend contract to accept an optional eventId, updating BioController and BioService so contest lists and returned bio data can be filtered by event while preserving existing judge and contestant scope restrictions.
2. Update BioService query construction so broader roles see event-filtered contests, contestants, judges, and role-based users, while narrower judge and contestant views remain constrained to their allowed contest/category scope and simply intersect with the selected event.
3. Add event and contest selectors to the shared Bios page, filter the contest selector by the chosen event, and send both filters through the existing directory query so the page reflects the selected scope consistently.
4. Add focused backend regression coverage for event-aware bio directory scoping where practical, then run targeted verification plus frontend type-check/build before closing the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Extended the shared bio directory contract with event-aware filtering and a returned events list so the canonical Bios page can drive event then contest scoping without introducing a separate role-specific path.
- Updated BioService query construction so broader roles get event-filtered directory data while judge and contestant scoped views still intersect against their allowed contest/category scope instead of widening access.
- Updated BiosPage to add event and contest selectors, reset contest selection when the event changes, and consume the expanded directory response shape.
- Added focused BioService regression coverage for broad-role event filtering and judge-scope event intersection.
- Verification: npx jest tests/unit/services/BioService.test.ts --runInBand, npm run build, cd frontend && npm run type-check, cd frontend && npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added event and contest scoping to the shared bios directory without splitting the experience into role-specific implementations.

Changes:
- Extended the shared bio directory backend contract so the /bios/directory route accepts eventId alongside contestId and returns an events list plus event-aware contest options.
- Updated BioService so broader roles receive event-filtered directory data while existing judge and contestant scope restrictions are preserved by intersecting their allowed contests/categories with the selected event.
- Updated the shared Bios page with event and contest selectors, contest reset-on-event-change behavior, and the expanded directory response shape.
- Added focused BioService regression coverage for broad-role event filtering and judge-scoped event intersection.

Verification:
- npx jest tests/unit/services/BioService.test.ts --runInBand
- npm run build
- cd frontend && npm run type-check
- cd frontend && npm run build

Notes:
- This change stays on the canonical shared bios path and does not introduce a separate emcee-only bios implementation.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
