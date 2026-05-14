---
id: TASK-19.19
title: Align integration tests with current auth and response contracts
status: Done
assignee:
  - '@codex'
created_date: '2026-05-01 01:33'
updated_date: '2026-05-14 04:47'
labels:
  - tests
  - integration
  - backend
  - api
dependencies: []
parent_task_id: TASK-19
priority: high
ordinal: 33013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After TASK-19.4 fixed tenant fallback and real JWT/bcrypt behavior, residual integration failures remain where tests expect outdated response wrappers, status codes, or token-in-body behavior. Representative files include reports, settings, advancedReporting, roleAssignment, winners, performance, and archive in `temp/task-19.4-integration-after-users.json`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Residual tests that expect body tokens, old wrappers such as mandatory `data`, or obsolete status codes are updated to the current API contract or removed with documented rationale.
- [x] #2 Reports/settings/advancedReporting/roleAssignment/winners/performance/archive targeted reruns pass or produce narrower follow-up tasks with exact evidence.
- [x] #3 Assertions continue to verify meaningful response shape and behavior rather than accepting broad dummy status arrays.
- [x] #4 Full integration rerun records updated counts and no QueueService/Prisma teardown regression.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Read the current failures in reports/settings/advancedReporting/roleAssignment/winners/performance/archive and compare them to route/controller behavior.
2. Replace stale body-token, wrapper, and status-code expectations with focused assertions that still prove the current contract.
3. Run targeted integration files for this task and inspect JSON failure evidence.
4. Run the full integration suite afterward and record counts/open-handle evidence; split unrelated residuals if needed.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Updated reports, settings, advancedReporting, roleAssignment, winners, performance, archive, commentary, and structureCopy integration tests for current auth/response contracts.
- Replaced cookie-only login body-token assumptions with JWT fallback in settings, advancedReporting, and structureCopy.
- Replaced stale report template wrapper expectations with direct created-template assertions and changed minimal-template coverage to assert current defaulted fields.
- Replaced broad dummy status arrays with exact current contract assertions for unsupported/placeholder routes and validation responses where they are the current supported behavior.
- Targeted TASK-19.19 rerun passed: reports/settings/advancedReporting/roleAssignment/winners/performance/archive/commentary, 8 suites / 60 tests.
- Structure-copy targeted rerun passed after auth and template ID validation fixes: 1 suite / 5 tests.
- Full integration rerun after all TASK-19.19 fixes: 51/55 suites passed, 499/537 tests passed, openHandles=0; remaining failures are DR/scoring/judges/workflow under TASK-19.21.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned integration tests with the current authentication and response contracts.

Changes:
- Updated stale body-token assumptions to use integration JWT fallback when login is cookie-only.
- Aligned reports, advanced reporting, role assignment, archive, winners, performance, commentary, and structure-copy assertions with current response shapes/statuses.
- Tightened several broad placeholder assertions into exact current-contract checks with response-body validation.

Tests:
- npm run test:integration -- --runTestsByPath tests/integration/reports.test.ts tests/integration/settings.test.ts tests/integration/advancedReporting.test.ts tests/integration/roleAssignment.test.ts tests/integration/winners.test.ts tests/integration/performance.test.ts tests/integration/archive.test.ts tests/integration/commentary.test.ts --json --outputFile=temp/task-19.19-targeted-after-fix.json
- npm run test:integration -- --runTestsByPath tests/integration/structureCopy.test.ts --json --outputFile=temp/task-19.19-structure-copy-after-template-id-fix.json
- npm run test:integration -- --json --outputFile=temp/task-19.19-full-after-structure-copy-fix.json (remaining failures are TASK-19.21; openHandles=0)
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
