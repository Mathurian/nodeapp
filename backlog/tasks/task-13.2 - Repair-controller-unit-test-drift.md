---
id: TASK-13.2
title: Repair controller unit test drift
status: Done
assignee:
  - '@codex'
created_date: '2026-04-27 21:47'
updated_date: '2026-04-29 02:52'
labels:
  - tests
  - unit-tests
  - controllers
dependencies:
  - TASK-13.1
parent_task_id: TASK-13
priority: high
ordinal: 2013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Repair failing controller-layer unit tests after the baseline audit identifies the current breakage. Scope includes files under `tests/unit/controllers/`, which currently covers 65 test files. Focus on controller-specific drift only: request/response mocks, updated service method signatures, changed error handling, tenant-aware request context, and authorization expectations. Keep controller fixes isolated from deeper service behavior changes wherever possible.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Failing controller unit tests are updated or fixed without widening scope into unrelated service logic
- [x] #2 Controller mocks reflect current request context and service signatures
- [x] #3 Controller unit tests pass consistently when run as a targeted group
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Start from the TASK-13.1 controller inventory and target the 20 failing controller files in clusters instead of one-by-one churn.
2. First fix shared test harness drift that blocks many controller files: request mocks must include tenant/super-admin context and Express helpers such as `req.get`; response helper expectations must match current `sendSuccess` signatures.
3. Repair stale service-call assertions for controller methods that now pass tenant scope or super-admin flags, beginning with the high-signal clusters: `adminController`, `eventsController`, `assignmentsController`, `usersController`, `backupController`, `boardController`, `reportsController`, and scoring/certification controllers.
4. Run targeted controller test subsets after each cluster with command-scoped `SESSION_SECRET` and `CSRF_SECRET`; keep production controller edits narrow and only where behavior is actually wrong.
5. Finish with `SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest --testPathPatterns=tests/unit/controllers --runInBand`, record remaining failures if any, then update AC/DoD/final summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Prefer repairing the tests when runtime behavior is correct. If a controller bug is found, keep the production fix narrow and note any downstream service-test impact instead of folding multiple layers into one change.

Plan approved. Starting controller repair work from the TASK-13.1 inventory, with focus on stale request mocks, tenant/super-admin service arguments, and response helper expectations.

- Fixed and verified judgeController contestant bio tests; the endpoint now uses contestantNumber and returns the current missing-number validation message.
- Verified: SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit/controllers/judgeController.test.ts --runInBand --silent (1 suite, 26 tests passed).

- Fixed and verified settingsController tests. Added Express header helpers to the mock response for no-store/Vary branding reads and updated theme asset paths to /uploads/theme/*.
- Verified: SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit/controllers/settingsController.test.ts --runInBand --silent (1 suite, 55 tests passed).

- Fixed and verified backupController tests against current tenant-scoped backup behavior, findFirst/update backup log paths, and backup schedule CRUD behavior.
- Verified: SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit/controllers/backupController.test.ts --runInBand --silent (1 suite, 39 tests passed).

- Fixed and verified certificationController tests. Stage-action tests now provide required signatures and mock certification pipeline helpers instead of asserting the old direct Prisma update implementation.
- Verified: SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit/controllers/certificationController.test.ts --runInBand --silent (1 suite, 36 tests passed).

- Aligned reports controller tests with persisted report instances and email dispatch summaries; targeted reports suite passes.
- Aligned tally master controller tests with tenant-aware service signatures, required certification signatures, retired 410 score-removal endpoints, and implemented score query responses; targeted tally master suite passes.

- Fixed hidden controller drift in users, scoring, and board suites: response helper mocks, transaction-backed scoring mutations, certification pipeline mocks, tenant-scoped board service calls, and removed obsolete board generate-report expectations. Targeted suites pass.

- Final controller target verified: SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit/controllers --runInBand --silent (65 suites, 1048 tests passed).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Repaired controller unit test drift across the targeted controller suite without changing production service behavior.

Changes:
- Updated controller tests and mocks for current tenant-aware request context, service signatures, response helper contracts, report/email dispatch shapes, certification pipeline delegation, and transaction-backed scoring mutations.
- Removed obsolete board generate-report expectations and aligned legacy score-removal endpoints with current retired/implemented behavior.
- Kept changes scoped to controller test files.

Tests:
- SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit/controllers --runInBand --silent

Result: 65 controller suites passed, 1048 tests passed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
