---
id: TASK-13.1
title: Audit current unit test failures
status: Done
assignee:
  - '@codex'
created_date: '2026-04-27 21:47'
updated_date: '2026-04-29 02:12'
labels:
  - tests
  - unit-tests
  - backend
dependencies: []
parent_task_id: TASK-13
priority: high
ordinal: 1013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Establish the current failing-unit-test baseline before changing production code or test expectations. Run the backend unit suite, capture failing files and recurring failure modes, and group them into repair tracks. The unit surface is large: 65 controller test files, 88 service test files, 23 middleware test files, plus config/security/utils coverage. This task should produce a concrete failure inventory so later tasks can target the smallest safe change set first.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A current failing-file inventory is recorded with affected areas
- [x] #2 Recurring failure classes are grouped (API drift, mock drift, tenant-context drift, async/timer drift, etc.)
- [x] #3 Follow-on repair tasks have enough detail to execute one area at a time
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Run the backend unit suite with a deterministic command and save raw output to `temp/task-13.1-unit-test-baseline.log` for later repair tasks.
2. If the full unit command exits before full reporting is gathered, parse that partial output and use it as the guide for targeted Jest discovery/listing or smaller unit subset runs so no area is missed.
3. Parse the full and targeted failure output into files, top error signatures, and likely cause categories such as API drift, mock drift, tenant-context drift, async/timer drift, dependency/config drift, and compile/import drift.
4. Record a concise repair-track summary in TASK-13.1 notes and final summary, then check AC/DoD and mark the task done only if no source/runtime changes were made and the inventory is complete.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Research-only task. Do not mix in production fixes here unless a blocker prevents the suite from even producing a stable failure list. Preserve raw failure output somewhere easy to reference from the repair subtasks.

Ran initial unit baseline: `npm run test:unit -- --runInBand`; raw log saved to `temp/task-13.1-unit-test-baseline.log`. Result was 183/183 suites failed before tests executed because `SESSION_SECRET` is required by `src/config/env.ts` but not seeded by `tests/setup.ts`.

Ran second audit pass with command-scoped test secrets: `SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npm run test:unit -- --runInBand`; raw log saved to `temp/task-13.1-unit-test-baseline-with-test-secrets.log`. Result: 60 failed suites, 123 passed suites, 697 failed tests, 3144 passed tests, 16 skipped, 3857 total. Compact inventory saved to `temp/task-13.1-unit-test-inventory.md`.

Failure tracks: controllers 20 files, services 36 files, middleware 4 files. Recurring classes are test env/config drift, controller API/signature drift, Prisma mock/data-shape drift, tenant-context drift, Redis/cache mock drift, async/resource cleanup drift, and file/crypto/export drift.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the unit-test baseline audit for TASK-13.

What changed:
- Ran the backend unit suite twice: first as configured, then with command-scoped `SESSION_SECRET` and `CSRF_SECRET` to get past the setup gate.
- Preserved raw logs in `temp/task-13.1-unit-test-baseline.log` and `temp/task-13.1-unit-test-baseline-with-test-secrets.log`.
- Added a compact repair inventory in `temp/task-13.1-unit-test-inventory.md`.

Findings:
- Default unit command currently fails all 183 suites before test execution because test setup does not seed required session/CSRF secrets.
- With test-only secrets, the actionable baseline is 60 failed suites, 123 passed suites, 697 failed tests, 3144 passed tests, 16 skipped.
- Failures group into controller API/signature drift, Prisma mock/data-shape drift, tenant-context drift, Redis/cache mock drift, async/resource cleanup drift, and file/crypto/export drift.

Follow-up routing:
- TASK-13.2: controller failures.
- TASK-13.3: test env, middleware, config, utility, and harness cleanup failures.
- TASK-13.4: core domain service failures.
- TASK-13.5: platform/support service failures.
- TASK-13.6: final full-suite rerun after focused repairs.

Tests run:
- `npm run test:unit -- --runInBand`
- `SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npm run test:unit -- --runInBand`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
