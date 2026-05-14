---
id: TASK-19.16
title: Resolve backend Jest JEST-01 Date.now soft-delete warnings
status: Done
assignee:
  - '@codex'
created_date: '2026-05-01 01:00'
updated_date: '2026-05-14 04:47'
labels:
  - tests
  - jest
  - backend
dependencies: []
parent_task_id: TASK-19
priority: high
ordinal: 26013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Full backend unit runs still emit Jest JEST-01 deprecation warnings that the `now` property was accessed on a soft-deleted global Function between test files. Investigate the tests or helpers that retain references to global Date/timer functions across Jest environments, fix the retained reference or teardown behavior, and verify full unit output no longer includes the warning.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The root test/helper/module retaining the stale global Date/timer reference is identified in implementation notes with reproduction evidence.
- [x] #2 The fix updates the offending test setup, mock, or module lifecycle rather than suppressing deprecation warnings globally.
- [x] #3 Verification records final suite/test counts and confirms no worker teardown warning or CircuitBreaker MaxListenersExceededWarning regression.
- [x] #4 Full backend unit suite output no longer contains Jest JEST-01 `now` soft-delete deprecation warnings.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the backend unit warning with the full unit command and capture output.
2. Search test setup and helpers for Date/timer mocks or references retained across Jest environments.
3. Fix the offending lifecycle or setup path without globally suppressing the warning.
4. Rerun full backend unit tests, record suite/test counts and warning absence, then update AC/DoD/final summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reproduced the Date.now soft-delete warning in full unit output: baseline had JEST-01 after MetricsService-backed tests, with trace pointing at MetricsService.checkAndResetStaleTestStatuses via its background status-reset interval.
- Also traced a secondary JEST-01 from errorHandler timeout tests where asynchronous database error logging ran after the Jest environment was torn down.
- Fixed lifecycle cleanup rather than suppressing warnings: MetricsService no longer starts the background status-reset interval when NODE_ENV is test, MetricsService tests destroy direct instances, shared Jest cleanup destroys the container MetricsService singleton, and timeout error-handler tests flush mocked async error logging.
- Updated stale controller unit expectations discovered during full-suite verification so tenant-scoped calls and current role enum values match production behavior.
- Final verification passed: npm run test:unit -- --json --outputFile=temp/task-19.16-unit-final-no-jest01.json produced 184/184 passed suites, 3913/3913 passed tests, 0 failed, 0 pending, 0 todo, 0 open handles, and no JEST-01/DeprecationWarning/MaxListenersExceededWarning/worker process/CircuitBreaker matches in temp/task-19.16-unit-final-no-jest01.txt.
- Additional verification passed: npm run test:typecheck and npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resolved the backend Jest JEST-01 Date.now soft-delete warning by fixing the MetricsService timer lifecycle and related test cleanup. MetricsService no longer starts its background status-reset interval under NODE_ENV=test, direct MetricsService tests destroy instances, and shared Jest cleanup also destroys the container singleton. The timeout error-handler test now mocks and flushes async error logging so it does not outlive the test environment.

While validating the full unit suite, stale controller unit expectations were aligned with the current tenant-scoped contracts and role enum values.

Tests:
- NODE_OPTIONS=--trace-deprecation npx jest tests/unit/services/MetricsService.test.ts tests/unit/middleware/errorHandler.timeout.test.ts --runInBand --no-forceExit --openHandlesTimeout=10000
- npm run test:unit -- --json --outputFile=temp/task-19.16-unit-final-no-jest01.json (184/184 suites, 3913/3913 tests, 0 open handles; warning scan clean)
- npm run test:typecheck
- npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
