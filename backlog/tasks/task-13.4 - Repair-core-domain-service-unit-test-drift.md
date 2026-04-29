---
id: TASK-13.4
title: Repair core domain service unit test drift
status: Done
assignee:
  - '@codex'
created_date: '2026-04-27 21:47'
updated_date: '2026-04-29 15:45'
labels:
  - tests
  - unit-tests
  - services
dependencies:
  - TASK-13.1
parent_task_id: TASK-13
priority: high
ordinal: 4013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Repair failing unit tests for core domain services in `tests/unit/services/` where the behavior directly affects business workflows: contests, categories, scoring, certifications, assignments, results, winners, users, auth, and related tenant-aware service logic. This track should address drift between current service behavior and stale test assumptions without pulling in unrelated infrastructure concerns.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Failing core domain service unit tests are repaired or aligned to current business rules
- [x] #2 Prisma/mock setup reflects current tenant-aware and cache-aware service behavior
- [x] #3 Core domain service unit tests pass consistently as a targeted group
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce a focused core-service baseline using command-scoped test secrets for the TASK-13.4 service files only, so fixes are measured against the actual current failures.
2. Repair the narrowest mock/setup drift first: Prisma delegate shapes, tenant-aware query arguments, cache invalidation calls, and service helper return shapes.
3. Align stale assertions to current business behavior for assignments, certifications, scoring, categories, contests, judges, users, tally/tracker, data wipe, and contestant numbering; only touch runtime service code if a failure exposes a real regression.
4. Rerun the targeted core-service group, then run smaller affected suites as needed to isolate any remaining failures.
5. Update TASK-13.4 notes, acceptance criteria, DoD, and final summary through the Backlog CLI once the targeted group is stable.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
This is the highest-risk repair track because changes can affect real business behavior. Prefer targeted expectation updates over broad production refactors. If a service family is especially unstable, split it again rather than widening a single patch.

Reviewed TASK-13.1 inventory and raw Jest log. Core-service failures cluster in AssignmentService, certification services, CategoryService, ContestService, DataWipeService, DeductionService, JudgeService, ScoringService, TallyMasterService, TrackerService, UserService, TestEventSetupService, and contestantNumberingService.

- Repaired service/test drift across the focused TASK-13.4 core domain suite, including tenant-aware DTO expectations, certification pipeline mock setup, Prisma transaction delegates, assignment ordering, scoring transaction mocks, and judge bio response shape.
- Fixed runtime regressions found by tests in contestant numbering import wiring, tracker category contestant counting, certification pipeline tenant-scoped category fallback, and auditor certification status details.
- Verified targeted group: 17 service test suites passed, 576 tests passed, 2 existing skips.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Repaired TASK-13.4 core domain service unit-test drift across assignment, category, contest, scoring, certification, auditor/tally, judge, user, tracker, data wipe, test event setup, deduction, uncertification, and contestant numbering service suites.

Changes:
- Aligned stale unit-test mocks and assertions with current tenant-aware Prisma shapes, certification pipeline behavior, board-role snapshots, assignment ordering, transaction delegates, and service response payloads.
- Fixed small runtime issues exposed by the suite: contestant numbering now uses the shared Prisma singleton correctly, tracker contest progress counts category contestants, certification pipeline falls back for existing category mock/query paths, and auditor certification status reports actual auditor certification record details.

Tests:
- SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npx jest --runInBand --silent --json --outputFile=temp/task-13.4-verified-jest.json --runTestsByPath <17 focused service test files>
- Result: 17 passed suites; 576 passed tests; 2 existing skipped tests.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
