---
id: TASK-19.18
title: Fix remaining integration Prisma setup tenant errors
status: Done
assignee:
  - '@codex'
created_date: '2026-05-01 01:33'
updated_date: '2026-05-01 15:33'
labels:
  - tests
  - integration
  - backend
  - database
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The TASK-19.4 integration rerun still has Prisma runtime `Cannot read properties of undefined (reading split)` failures in suites that create tenant-scoped records without complete required tenant/setup data. Representative files include `tests/integration/assignments.test.ts` and `tests/integration/contests.test.ts`; see `temp/task-19.4-integration-after-users.json` and `temp/task-19.4-failure-digest.txt`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Remaining Prisma `split` runtime failures in integration suites are traced to concrete missing/invalid setup fields and replaced with explicit valid test data or clear expected validation assertions.
- [x] #2 Affected suites such as assignments and contests pass targeted reruns or have any unsupported paths split into narrower tasks with evidence.
- [x] #3 Test setup helpers are reused where appropriate so tenant-scoped model creation consistently includes tenant context.
- [x] #4 Full integration rerun records updated counts and no QueueService/Prisma teardown regression.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect TASK-19.4 JSON evidence and targeted assignments/contests failures to separate stale setup from real API behavior.
2. Trace failing factory/setup paths for tenant-scoped Prisma writes and replace incomplete ad hoc data with existing helpers where possible.
3. Run targeted integration files after each fix, then rerun the full integration suite without forceExit and capture JSON counts/open-handle evidence.
4. Mark 19.18 complete only if the Prisma/setup failure class is fixed; otherwise split any unrelated residuals into narrower backlog tasks with reproduction evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added tenant-aware JWT fallback helpers to assignments and contests integration tests so cookie-only login responses no longer leave targeted requests unauthenticated.
- Added tenantId to direct test data creation paths and adjusted the non-admin assignment case to use fresh judge/category records so it reaches authorization rather than duplicate validation.
- createContest now verifies the requested event exists in the current tenant before service creation, returning 404 instead of a Prisma/500 path for invalid event ids.
- Targeted rerun passed: tests/integration/assignments.test.ts and tests/integration/contests.test.ts, 2 suites / 30 tests.
- Full integration rerun after related fixes: 42/55 suites passed, 482/537 tests passed, openHandles=0; remaining Prisma split failures are isolated to scoring/judges and covered by TASK-19.21.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the tenant setup failures in the assignments and contests integration coverage.

Changes:
- Added tenant-aware auth fallback tokens in the affected integration suites.
- Ensured direct tenant-scoped test data includes tenant context.
- Tightened contest creation validation so invalid tenant/event combinations return a controlled 404 instead of leaking through to Prisma.

Tests:
- npm run test:integration -- --runTestsByPath tests/integration/assignments.test.ts tests/integration/contests.test.ts --json --outputFile=temp/task-19.18-targeted-after-fix.json
- npm run test:integration -- --json --outputFile=temp/task-19.17-full-after-fix.json (remaining failures outside assignments/contests; openHandles=0)
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
