---
id: TASK-19.25
title: Fix scoring contract dummy-pass certification setup
status: Done
assignee:
  - '@codex'
created_date: '2026-05-02 17:52'
updated_date: '2026-05-02 18:08'
labels:
  - tests
  - contracts
  - scoring
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The final TASK-19 backend rerun showed tests/contracts/scoring.contract.test.ts reporting a pass while logging "Skipping contract test: no scores or not found" and returning early. That hides missing contract coverage for certification behavior when fixture data is absent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The scoring contract certification path seeds or selects deterministic score data so the certification request is exercised instead of returning early.
- [x] #2 tests/contracts/scoring.contract.test.ts has no console warning or early return for missing scores in the expected happy/covered path.
- [x] #3 npm test or npm run test:contracts reports contract tests passing without the dummy-pass warning.
- [x] #4 If no-score behavior is intentionally covered, it is asserted explicitly as its own negative-path contract test.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the scoring contract certification test and fixture setup around the no-scores early return.
2. Seed or select deterministic score data so the certification endpoint is actually exercised.
3. Replace the warning/return branch with explicit assertions for success or an intentional negative-path test.
4. Run the focused scoring contract suite plus build/typecheck if code changes are needed, then close the task with counts.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added a dedicated certification contestant and score fixture so POST /api/scoring/category/:categoryId/certify exercises real score certification.
- Replaced the no-scores warning/early return with a typed-signature happy-path request and explicit response assertions.
- Aligned ScoringService certification response with the existing contract schema by returning certified boolean plus certifiedCount.
- Verification: npm run test:contracts -- --runTestsByPath tests/contracts/scoring.contract.test.ts passed 1 suite / 14 tests with no no-scores dummy-pass warning.
- Verification: npx jest tests/unit/services/ScoringService.test.ts tests/unit/controllers/scoringController.test.ts --runInBand --no-forceExit passed 2 suites / 111 tests.
- Verification: npm run test:typecheck passed; npm run build passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the scoring certification contract dummy pass by making the contract fixture deterministic and requiring the certify endpoint to run its real success path.

Changes:
- Added a dedicated score fixture for category certification coverage in tests/contracts/scoring.contract.test.ts.
- Removed the happy-path early return for missing scores and asserted the typed-signature certification response.
- Updated ScoringService to return { certified: boolean, certifiedCount: number }, matching the existing contract schema, and updated affected unit expectations.

Tests:
- npm run test:contracts -- --runTestsByPath tests/contracts/scoring.contract.test.ts
- npx jest tests/unit/services/ScoringService.test.ts tests/unit/controllers/scoringController.test.ts --runInBand --no-forceExit
- npm run test:typecheck
- npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
