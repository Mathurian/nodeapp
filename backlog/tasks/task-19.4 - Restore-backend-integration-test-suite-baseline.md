---
id: TASK-19.4
title: Restore backend integration test suite baseline
status: Done
assignee:
  - '@codex'
created_date: '2026-04-30 13:36'
updated_date: '2026-05-01 20:44'
labels:
  - tests
  - integration
  - backend
  - api
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The backend integration slice ran 54 suites and 535 tests; all 535 failed. The dominant blocker was the missing users.boardRole column, with cascading undefined setup objects and queue worker noise. After schema alignment, the suite needs a focused rerun and any remaining failures fixed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 npm run test:integration executes real tests and exits successfully
- [x] #2 All integration suites pass, or any remaining failures are split into new focused tasks with evidence
- [x] #3 The final integration result records suite and test counts from the JSON reporter
- [x] #4 Integration setup does not leave QueueService workers or Prisma clients running after tests complete
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Run the integration setup and suite with captured output/JSON evidence, starting with `npm run test:integration` or the equivalent Jest command plus JSON output, to establish the current failure profile after schema alignment.
2. If the suite still fails broadly, inspect the earliest/root failures first instead of chasing cascades; focus on schema/setup factories, auth/token setup, QueueService worker teardown, and Prisma lifecycle cleanup.
3. Implement only fixes needed to make the integration setup and real API tests execute correctly, adding teardown or setup regression coverage where practical.
4. Re-run targeted failing integration files as fixes land, then run the full integration suite again and capture final suite/test counts from a JSON reporter output.
5. If any integration failures remain and are not safe to solve in this task, create focused high-priority follow-up backlog tasks with exact failing files, error messages, and reproduction commands.
6. Record final pass/fail evidence, teardown status, residuals, and test counts in TASK-19.4; then check AC/DoD and add a PR-style final summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Baseline run after schema setup: `temp/task-19.4-integration-baseline.json` recorded 55 suites, 537 tests, 1 passed suite / 49 passed tests / 488 failed tests. The original `users.boardRole` schema blocker is gone; required schema columns are verified by `scripts/test-db-setup.sh`.
- Root setup fixes implemented: integration/contract Jest runs now use real `jsonwebtoken` and `bcrypt` instead of unit-style global mocks; test setup adds `test-utils-tenant` to `TENANT_DEFAULT_SLUGS`; shared `generateAuthToken` records tenant ids for helper-created users.
- Updated auth integration for current cookie-based login behavior and tenant-scoped manual JWT fallback. Targeted `tests/integration/auth.test.ts` now passes: 27/27 tests.
- Fixed `/api/users` list behavior exposed by integration tests: list responses no longer include password hashes and `role` query filtering is applied. Targeted `tests/integration/users.test.ts` now passes: 27/27 tests.
- Verification: `npm run build` passed.
- Latest full integration run: `temp/task-19.4-integration-after-users.json` recorded 55 suites, 537 tests, 37 passed suites / 406 passed tests / 18 failed suites / 131 failed tests.
- No-force teardown verification: `temp/task-19.4-integration-no-force.json` recorded the same 55 suites / 537 tests / 37 passed suites / 406 passed tests / 18 failed suites / 131 failed tests, `openHandles: 0`, and no `Force exiting Jest`, worker teardown, MaxListeners, or `Jest did not exit` warnings in `temp/task-19.4-integration-no-force.log`.
- Updated `test:integration` to run with `--no-forceExit --openHandlesTimeout=10000` so teardown warnings are visible instead of masked.
- Remaining failures were split into focused high-priority follow-ups: TASK-19.17 search/custom-field route coverage, TASK-19.18 Prisma tenant/setup errors, TASK-19.19 response/auth contract drift, TASK-19.20 MFA integration dependencies/assertions, TASK-19.21 workflow/DR/scoring/commentary flows.

Final integration baseline restored after TASK-19.17 through TASK-19.21 fixes. Full verification command: env SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npm run test:integration -- --json --outputFile=temp/task-19.21-full-integration-after-fix.json. Result: success=true, 55/55 suites passed, 537/537 tests passed, 0 failures, openHandles=0. npm run build passed after the integration fixes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the backend integration test baseline after the schema, auth, response-contract, MFA, workflow, DR, scoring, search, custom-field, and tenant setup fixes were completed in focused subtasks.

Final evidence:
- Full integration: temp/task-19.21-full-integration-after-fix.json -> 55/55 suites and 537/537 tests passed, openHandles=0.
- npm run build passed.

No remaining integration failures were left to split.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
