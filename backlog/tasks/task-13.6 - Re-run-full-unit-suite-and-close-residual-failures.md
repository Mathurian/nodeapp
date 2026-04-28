---
id: TASK-13.6
title: Re-run full unit suite and close residual failures
status: To Do
assignee: []
created_date: '2026-04-27 21:47'
updated_date: '2026-04-28 18:39'
labels:
  - tests
  - unit-tests
  - backend
dependencies:
  - TASK-13.2
  - TASK-13.3
  - TASK-13.4
  - TASK-13.5
parent_task_id: TASK-13
priority: high
ordinal: 6013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After the focused repair tracks land, rerun the full backend unit suite and resolve any remaining cross-cutting failures. This task is the final verification gate for restoring a trustworthy baseline. It should catch interaction issues that do not appear in isolated test groups, such as shared mock pollution, env-state leakage, module reset problems, or order-dependent failures.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The full backend unit suite is rerun from a clean baseline
- [ ] #2 Residual failures are fixed or explicitly documented with follow-up tasks
- [ ] #3 Final commands and outcome are recorded for future reference
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Run the full backend unit suite after the repair subtasks complete.
2. Resolve remaining order-dependent or shared-state failures with the smallest safe fixes.
3. Record the final pass/fail state, command used, and any residual follow-up work.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Do not start here. This task is only meaningful after the focused repair tracks are complete. If residual failures point to a large new subsystem problem, create a follow-up task instead of burying it in the closeout step.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
