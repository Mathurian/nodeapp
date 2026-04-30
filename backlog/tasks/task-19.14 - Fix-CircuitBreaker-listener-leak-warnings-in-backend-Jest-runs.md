---
id: TASK-19.14
title: Fix CircuitBreaker listener leak warnings in backend Jest runs
status: To Do
assignee: []
created_date: '2026-04-30 16:10'
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
The full backend Jest run from TASK-19.1 still emits CircuitBreaker MaxListenersExceededWarning lines even after the QueueService worker emitter spam was resolved. Investigate the CircuitBreaker listener lifecycle in tests and production-facing code, then fix or intentionally document the handling so normal backend Jest runs do not produce listener leak warnings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Normal backend Jest runs no longer emit CircuitBreaker MaxListenersExceededWarning output
- [ ] #2 The root cause is fixed through listener cleanup, singleton isolation, or scoped lifecycle management rather than hiding warnings with an unjustified global listener cap
- [ ] #3 Targeted tests or verification cover the affected CircuitBreaker listener registration and cleanup path
- [ ] #4 Implementation notes record the verification command and confirm any remaining full-suite failures are unrelated
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
