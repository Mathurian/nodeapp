---
id: TASK-19.15
title: Fix remaining backend Jest worker teardown open handles
status: To Do
assignee: []
created_date: '2026-04-30 19:54'
labels:
  - tests
  - jest
  - backend
  - ci
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Backend unit runs now pass assertions, but Jest still reports that a worker process failed to exit gracefully and was force exited. Investigate remaining open handles after the TASK-19.1 and TASK-19.14 cleanup work, identify the leaking timers/clients/sockets/background resources, and fix or explicitly document any intentional long-lived handles so normal backend Jest runs exit cleanly without forced worker termination.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Normal backend Jest unit runs no longer print the worker process failed to exit gracefully warning
- [ ] #2 Focused diagnostics using JEST_DETECT_OPEN_HANDLES=true, --detectOpenHandles, or equivalent evidence identify the remaining open handle source before the fix
- [ ] #3 The fix closes, unrefs, scopes, or mocks the leaking resource rather than masking the warning with forceExit or broad timeouts
- [ ] #4 Full backend unit verification records final suite/test counts and confirms no CircuitBreaker MaxListenersExceededWarning regression
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
