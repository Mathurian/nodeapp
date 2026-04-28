---
id: TASK-13.1
title: Audit current unit test failures
status: To Do
assignee: []
created_date: '2026-04-27 21:47'
updated_date: '2026-04-27 21:47'
labels:
  - tests
  - unit-tests
  - backend
dependencies: []
parent_task_id: TASK-13
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establish the current failing-unit-test baseline before changing production code or test expectations. Run the backend unit suite, capture failing files and recurring failure modes, and group them into repair tracks. The unit surface is large: 65 controller test files, 88 service test files, 23 middleware test files, plus config/security/utils coverage. This task should produce a concrete failure inventory so later tasks can target the smallest safe change set first.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A current failing-file inventory is recorded with affected areas
- [ ] #2 Recurring failure classes are grouped (API drift, mock drift, tenant-context drift, async/timer drift, etc.)
- [ ] #3 Follow-on repair tasks have enough detail to execute one area at a time
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Run `npm run test:unit -- --runInBand` or an equivalent deterministic unit-suite command.
2. Capture failing files, top error signatures, and whether each failure is caused by changed runtime behavior or stale test assumptions.
3. Summarize the inventory into the controller, middleware/config/utils, core service, and platform/support service repair tracks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Research-only task. Do not mix in production fixes here unless a blocker prevents the suite from even producing a stable failure list. Preserve raw failure output somewhere easy to reference from the repair subtasks.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
