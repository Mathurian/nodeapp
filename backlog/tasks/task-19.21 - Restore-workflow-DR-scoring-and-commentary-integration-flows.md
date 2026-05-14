---
id: TASK-19.21
title: Restore workflow DR scoring and commentary integration flows
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
ordinal: 32013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The TASK-19.4 rerun still has multi-step workflow, DR automation, scoring, commentary, and structure-copy integration failures. These suites mix route drift, missing idempotency/tenant setup, expected status mismatches, and real service errors. Use `temp/task-19.4-integration-after-users.json` and `temp/task-19.4-failure-digest.txt` as the starting evidence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Workflow, DR automation, scoring, commentary, and structure-copy failures are triaged into concrete root causes with response/body evidence.
- [x] #2 Covered offline-write routes include valid idempotency keys where the current API requires them.
- [x] #3 Targeted reruns for the affected files pass or remaining failures are split into smaller follow-up tasks with reproduction commands.
- [x] #4 Full integration rerun records updated counts and no QueueService/Prisma teardown regression.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Use the latest full integration JSON to scope the remaining DR, scoring/judges, and workflow failures now that commentary and structure-copy are clean.
2. Patch tests or production behavior only where the evidence identifies a current API contract mismatch, missing required idempotency/tenant setup, or real service error.
3. Run targeted DR/scoring/judges/workflow suites after each fix and capture JSON output.
4. Run the full integration suite and either close the task or split any remaining failures with exact reproduction evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Workflow triage: current routes support embedded template steps and wrapped responses; legacy step/transition/validate/history/migrate/metrics/bottleneck routes are unsupported 404s. Patched the test to exercise current routes and mapped unauthorized workflow advancement to 403 instead of a generic server error.

Workflow targeted rerun passed: env SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npm run test:integration -- --runTestsByPath tests/integration/workflow.test.ts --json --outputFile=temp/task-19.21-workflow-after-403-fix.json. Result: 1 suite, 16 tests passed. Residual console evidence remains the known BullMQ/Jest cleanup warning from QueueService background resources.

DR/scoring/judges triage and fixes: restored legacy-compatible DR config POST/update normalization, rejected unsupported backup frequencies, fixed compressed backup output path handling, normalized DR test type input, serialized dashboard backup sizes, restored category score listing and judge history routes, initialized offline-write manifest in scoring integration setup, added valid X-Idempotency-Key headers to enforced scoring write routes, and corrected tenant-aware scoring/judge fixtures. Affected rerun passed in temp/task-19.21-affected-after-eventbus-fix.json: 4 suites, 62 tests passed, with no QueueService cleanup warning.

Final verification: full integration rerun passed in temp/task-19.21-full-integration-after-fix.json with success=true, 55/55 suites passed, 537/537 tests passed, 0 failures, and openHandles=0. npm run build also passed after regenerating the offline-write manifest artifacts. The earlier QueueService/BullMQ cleanup warning was eliminated by disabling real EventBus queue publishing in test runtime unless explicitly enabled or mocked.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the remaining TASK-19 integration baseline failures across workflow, DR automation, scoring, and judge flows.

Changes:
- Aligned workflow integration coverage with the current embedded-step workflow API and mapped unauthorized advancement to 403.
- Restored legacy-compatible DR config create/update handling, fixed compressed backup paths, normalized DR test type input, rejected unsupported frequencies, and made dashboard output JSON-safe.
- Restored category score listing and judge history routes.
- Made scoring integration setup initialize the offline-write manifest and send valid idempotency keys on enforced write routes.
- Corrected scoring/judge tenant fixtures, token fallback handling, assignments, and direct score setup.
- Prevented real EventBus queue publishing during test runtime unless explicitly enabled or mocked, removing the QueueService/BullMQ cleanup warning without changing production queue behavior.

Tests:
- Affected integration rerun: temp/task-19.21-affected-after-eventbus-fix.json -> 4/4 suites and 62/62 tests passed.
- Full integration rerun: temp/task-19.21-full-integration-after-fix.json -> 55/55 suites and 537/537 tests passed, openHandles=0.
- npm run build passed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
