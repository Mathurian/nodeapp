---
id: TASK-13.3
title: 'Repair middleware, config, and utils unit test drift'
status: Done
assignee:
  - '@codex'
created_date: '2026-04-27 21:47'
updated_date: '2026-04-29 03:06'
labels:
  - tests
  - unit-tests
  - middleware
dependencies:
  - TASK-13.1
parent_task_id: TASK-13
priority: medium
ordinal: 3013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Repair failing unit tests in the lightweight infrastructure layers: `tests/unit/middleware/`, `tests/unit/config/`, `tests/unit/security/`, and `tests/unit/utils/`. These files tend to fail due to request-shape drift, timer behavior, rate-limit changes, logging side effects, config-default changes, or utility normalization updates. Keep this track narrow so support-layer repairs can land independently of controller and service fixes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Failing middleware/config/security/utils unit tests are repaired or updated to current behavior
- [x] #2 Timer/mock/environment setup is stable for the affected tests
- [x] #3 The targeted support-layer unit tests pass consistently when run together
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the support-layer target with command-scoped SESSION_SECRET and CSRF_SECRET: tests/unit/middleware, tests/unit/config, tests/unit/security, and tests/unit/utils.
2. Seed required unit-test secrets in the shared Jest setup if the default unit command still fails before tests execute, keeping the values test-only and overridable by the environment.
3. Repair known middleware drift from TASK-13.1 first: assignment validation, auth, cache middleware, and virus scan comprehensive tests.
4. Check config/security/utils failures from the targeted run and update mocks or expectations only where they reflect current behavior.
5. Rerun the full support-layer target together, then update AC/DoD/final summary with exact test evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
This track is a good place to remove brittle assertions and duplicated mock setup when the audit shows the same failure pattern across multiple files. Avoid mixing in controller/service fixes here.

- Reproduced support-layer target with test secrets: initial failures were in cache middleware, virus scan middleware, auth middleware, and assignment validation.
- Repaired middleware unit drift by aligning test mocks with current module imports and Jest reset behavior; assignment validation now mocks judge lookups and prisma.default.
- Focused middleware reruns now pass for assignment validation, auth, cache, and virus scan suites.

- Full support-layer target passed: SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit/middleware tests/unit/config tests/unit/security tests/unit/utils --runInBand --silent (30 suites, 179 tests).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Repaired middleware/config/security/utils unit test drift for the support-layer slice of TASK-13.

Changes:
- Added test-only fallback SESSION_SECRET and CSRF_SECRET in shared Jest setup so support-layer imports have stable secrets without overriding caller-provided values.
- Updated assignment validation comprehensive tests to match current judge-based validation and prisma.default import shape.
- Updated auth tests with a per-test jsonwebtoken mock registry so resetMocks does not turn signed tokens into undefined values.
- Updated cache and virus scan comprehensive tests to require middleware after mocks and use reset-stable service/fs/crypto doubles.

Tests:
- SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest tests/unit/middleware tests/unit/config tests/unit/security tests/unit/utils --runInBand --silent (30 suites, 179 tests passed)

Risk:
- Jest still emits existing soft-delete deprecation warnings during the broader run, but they do not fail the target.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
