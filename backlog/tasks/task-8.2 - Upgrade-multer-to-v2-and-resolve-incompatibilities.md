---
id: TASK-8.2
title: Upgrade multer to v2 and resolve incompatibilities
status: To Do
assignee: []
created_date: '2026-04-28 02:33'
updated_date: '2026-04-28 02:34'
labels:
  - npm
  - security
  - backend
dependencies:
  - TASK-8.1
parent_task_id: TASK-8
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Upgrade the direct upload dependency from multer 1.x to 2.x after the usage inventory is complete. Update the dependency, fix compile/runtime incompatibilities in the affected routes, and keep the code changes limited to enabling the upgrade so targeted regression validation can remain in TASK-9.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Multer is upgraded to a 2.x release
- [ ] #2 Compile-time and route-level incompatibilities are resolved
- [ ] #3 The upgrade remains behavior-preserving enough for targeted regression validation in TASK-9
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Upgrade `multer` and any related typing/package references.
2. Update affected routes only where required for compatibility.
3. Confirm the app builds and the upload surfaces are ready for targeted regression testing in TASK-9.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation-only subtask. Do not widen this into a full regression pass; that remains in TASK-9.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
