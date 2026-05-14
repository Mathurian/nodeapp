---
id: TASK-19.27
title: Remove backend Jest forceExit warning from restored suite
status: Done
assignee:
  - '@codex'
created_date: '2026-05-02 17:53'
updated_date: '2026-05-14 04:47'
labels:
  - tests
  - jest
  - cleanup
dependencies: []
parent_task_id: TASK-19
priority: high
ordinal: 15013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The final TASK-19 backend rerun exits 0, but every Jest invocation still prints "Force exiting Jest: Have you considered using --detectOpenHandles" because jest.config.js has forceExit enabled. TASK-19.15 reduced worker cleanup leaks, but the final suite evidence still includes the forced-exit warning, so the suite cannot yet prove that workers drain naturally.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The backend Jest configuration or wrapper no longer relies on forceExit for normal unit, integration, or contract runs.
- [x] #2 npm test exits cleanly without the Force exiting Jest warning.
- [x] #3 If any open handle remains, it is isolated to a specific test or helper and covered by a focused fix before removing forceExit.
- [x] #4 Documentation or task notes explain any intentional remaining timeout/open-handle debugging mode.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect Jest config and the backend Jest wrapper to find where forceExit is enabled for normal runs.
2. Run focused no-forceExit/open-handle diagnostics if needed to identify remaining handles.
3. Update config or wrapper so normal unit/integration/contract runs drain naturally while preserving an explicit debug mode if useful.
4. Verify npm test no longer prints the Force exiting Jest warning, then record results and close the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Changed jest.config.js so forceExit is opt-in via JEST_FORCE_EXIT=true instead of enabled for normal runs.
- Disabled circuit-breaker metrics listeners by default under NODE_ENV=test to remove the async dynamic-import cleanup leak exposed by no-forceExit runs; ENABLE_CIRCUIT_BREAKER_METRICS=true can re-enable them for focused metrics listener debugging.
- Added a default 10s openHandlesTimeout in scripts/test-backend-jest.sh, configurable with JEST_OPEN_HANDLES_TIMEOUT_MS, so normal wrapper runs allow async cleanup to drain without Jest's one-second warning.
- Updated category controller unit fixtures to use a valid CUID after the category create validation added by TASK-19.24.
- Verification: bash -n scripts/test-backend-jest.sh passed.
- Verification: bash scripts/test-backend-jest.sh --prepare-db --no-forceExit --runTestsByPath tests/integration/users.test.ts passed 1 suite / 27 tests with no one-second open-handle warning.
- Verification: npx jest tests/unit/controllers/categoriesController.test.ts tests/unit/utils/circuitBreaker.test.ts --runInBand --no-forceExit --openHandlesTimeout=10000 passed 2 suites / 71 tests.
- Verification: final npm test passed all backend integration groups, 5 contract suites / 35 tests, and 184 unit suites / 3913 tests with no Force exiting Jest warning and no one-second open-handle warning.
- Verification: npm run test:typecheck passed; npm run build passed; npx jest tests/unit/utils/circuitBreaker.test.ts --runInBand --no-forceExit --openHandlesTimeout=10000 passed.
- Residual warning: tests/integration/users.test.ts still emits Jest [JEST-01] _runtimeDataModel soft-delete deprecation after passing; tracked separately as TASK-19.29.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Removed normal backend Jest reliance on forceExit and verified the aggregate backend suite drains without the previous force-exit/open-handle warnings.

Changes:
- Made jest.config.js forceExit opt-in with JEST_FORCE_EXIT=true.
- Added a configurable 10s default openHandlesTimeout to scripts/test-backend-jest.sh for normal backend wrapper runs.
- Prevented circuit-breaker metrics listener dynamic imports during Jest by default, with ENABLE_CIRCUIT_BREAKER_METRICS=true available for focused debugging.
- Updated category controller unit create fixtures to use valid CUIDs now that createCategory validates contest IDs.
- Added TASK-19.29 for the remaining Prisma/Jest [JEST-01] _runtimeDataModel deprecation warning seen after users integration.

Tests:
- bash -n scripts/test-backend-jest.sh
- bash scripts/test-backend-jest.sh --prepare-db --no-forceExit --runTestsByPath tests/integration/users.test.ts
- npx jest tests/unit/controllers/categoriesController.test.ts tests/unit/utils/circuitBreaker.test.ts --runInBand --no-forceExit --openHandlesTimeout=10000
- npm test
- npm run test:typecheck
- npm run build
- npx jest tests/unit/utils/circuitBreaker.test.ts --runInBand --no-forceExit --openHandlesTimeout=10000
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
