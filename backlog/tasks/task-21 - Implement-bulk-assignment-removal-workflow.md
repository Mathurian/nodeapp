---
id: TASK-21
title: Implement bulk assignment removal workflow
status: To Do
assignee: []
created_date: '2026-05-09 20:30'
labels:
  - assignments
  - backend
  - frontend
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a true bulk assignment removal workflow for the assignments area instead of relying on per-row manual or fan-out deletes. Cover the assignment types exposed in the assignments UI and make the bulk action operationally safe, tenant-aware, and observable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Assignments UI supports removing multiple selected assignments in one action for each supported assignment type.
- [ ] #2 Bulk removal uses dedicated backend orchestration or equivalent safe server-side handling instead of requiring users to remove items one by one.
- [ ] #3 The operation returns clear success and failure results, preserves tenant boundaries, and logs bulk removal activity.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
