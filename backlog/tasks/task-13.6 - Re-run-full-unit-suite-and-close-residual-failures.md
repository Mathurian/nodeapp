---
id: TASK-13.6
title: Re-run full unit suite and close residual failures
status: Done
assignee:
  - '@codex'
created_date: '2026-04-27 21:47'
updated_date: '2026-04-30 04:45'
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
priority: medium
ordinal: 6013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After the focused repair tracks land, rerun the full backend unit suite and resolve any remaining cross-cutting failures. This task is the final verification gate for restoring a trustworthy baseline. It should catch interaction issues that do not appear in isolated test groups, such as shared mock pollution, env-state leakage, module reset problems, or order-dependent failures.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The full backend unit suite is rerun from a clean baseline
- [x] #2 Residual failures are fixed or explicitly documented with follow-up tasks
- [x] #3 Final commands and outcome are recorded for future reference
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm prerequisite repair tasks are complete and capture the current clean repository/test context.
2. Run the full backend unit suite with the required test secrets, saving JSON output under temp/ for failure inventory.
3. If the full run exposes residual failures, group them by root cause and apply the smallest safe fixes or create/document follow-up tasks for anything out of scope.
4. Rerun targeted failing areas as needed, then rerun the full backend unit suite from a clean baseline.
5. Record commands, final outcome, residual skips/follow-ups, and complete AC/DoD only when the final state is stable.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Do not start here. This task is only meaningful after the focused repair tracks are complete. If residual failures point to a large new subsystem problem, create a follow-up task instead of burying it in the closeout step.

- Full unit baseline run completed with one residual suite failure: ReportEmailService scheduleReportEmail used the real QueueService/BullMQ path and failed against the global ioredis mock. Baseline result: 182 suites passed, 1 failed; 3888 passed, 3 failed, 16 skipped.
- Repaired ReportEmailService test module loading so QueueService is mocked before the service is required; also made the global ioredis mock expose default and named constructor forms. Targeted ReportEmailService suite now passes: 35 tests.

- Full unit baseline completed: 182 suites passed, 1 failed; 3888 tests passed, 3 failed, 16 skipped. The only residual failure was ReportEmailService scheduling tests loading the real QueueService/BullMQ path because the service module was imported before the test mock was applied.
- Updated the ReportEmailService unit setup so the service is required after resetting modules and applying the QueueService mock. Expanded the global ioredis mock to support default and named constructor import shapes. Verified ReportEmailService in isolation: 35 tests passed.

- Final verification passed: full backend unit suite completed with 183/183 suites passing, 3891 tests passing, 0 failures, and the pre-existing 16 skips. JSON result: temp/task-13.6-full-unit-final.json.
- Additional verification passed: npm run build and git diff --check. Jest still emits the pre-existing soft-delete deprecation warnings; skipped-test evaluation is tracked separately after the unit-suite repair work.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Closed the final unit-suite restoration gate by rerunning the full backend unit suite, fixing the only residual failure, and verifying the final baseline.

Changes:
- Updated the global ioredis Jest mock to expose CommonJS/default/named constructor shapes so services imported through different module forms see the same mock.
- Adjusted ReportEmailService tests to load the service after resetting modules and installing the QueueService mock, preventing the real BullMQ path from running in unit tests.

Verification:
- SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit/services/ReportEmailService.test.ts --runInBand --silent --json --outputFile=temp/task-13.6-report-email-jest.json: 35 passed.
- SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit --runInBand --silent --json --outputFile=temp/task-13.6-full-unit-final.json: 183 suites passed, 3891 tests passed, 16 skipped, 0 failed.
- npm run build: passed.
- git diff --check: passed.

Notes:
- No new follow-up task was created for skipped tests because skipped-test evaluation is already tracked separately after the suite repair work.
- Jest continues to emit the existing soft-delete deprecation warning during the long run; it does not fail the suite.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
