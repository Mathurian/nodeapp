---
id: TASK-19.16
title: Resolve backend Jest JEST-01 Date.now soft-delete warnings
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-01 01:00'
updated_date: '2026-05-02 01:55'
labels:
  - tests
  - jest
  - backend
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Full backend unit runs still emit Jest JEST-01 deprecation warnings that the `now` property was accessed on a soft-deleted global Function between test files. Investigate the tests or helpers that retain references to global Date/timer functions across Jest environments, fix the retained reference or teardown behavior, and verify full unit output no longer includes the warning.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The root test/helper/module retaining the stale global Date/timer reference is identified in implementation notes with reproduction evidence.
- [ ] #2 The fix updates the offending test setup, mock, or module lifecycle rather than suppressing deprecation warnings globally.
- [ ] #3 Verification records final suite/test counts and confirms no worker teardown warning or CircuitBreaker MaxListenersExceededWarning regression.
- [ ] #4 Full backend unit suite output no longer contains Jest JEST-01 `now` soft-delete deprecation warnings.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the backend unit warning with the full unit command and capture output.
2. Search test setup and helpers for Date/timer mocks or references retained across Jest environments.
3. Fix the offending lifecycle or setup path without globally suppressing the warning.
4. Rerun full backend unit tests, record suite/test counts and warning absence, then update AC/DoD/final summary.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
