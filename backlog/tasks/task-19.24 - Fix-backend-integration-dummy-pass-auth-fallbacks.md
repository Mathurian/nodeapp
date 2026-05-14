---
id: TASK-19.24
title: Fix backend integration dummy-pass auth fallbacks
status: Done
assignee:
  - '@codex'
created_date: '2026-05-02 17:52'
updated_date: '2026-05-14 04:47'
labels:
  - tests
  - integration
  - auth
dependencies: []
parent_task_id: TASK-19
priority: high
ordinal: 17013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The final TASK-19 rerun showed integration suites exiting 0 while individual test bodies logged auth-related skip warnings and returned early. These are dummy-pass coverage gaps: categories.test.ts logs "Category creation test skipped: Authentication issue persists" and events.test.ts logs "Event creation test skipped: Authentication issue persists" while the suites report all tests passed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 tests/integration/categories.test.ts no longer returns early after auth setup fails; it either exercises category creation successfully or fails with an actionable assertion.
- [x] #2 tests/integration/events.test.ts no longer returns early after auth setup fails; it either exercises event creation successfully or fails with an actionable assertion.
- [x] #3 npm test output no longer includes the category/event auth skip warning strings while preserving passing integration coverage.
- [x] #4 Any required auth fixture or permission setup changes are deterministic for local and CI test database runs.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the category and event integration tests around the auth retry/early-return branches.
2. Identify why the authenticated create requests still receive 401/403 in those branches.
3. Replace dummy-pass early returns with deterministic auth/setup or strict assertions.
4. Run focused integration tests and then the relevant backend wrapper command to confirm the skip warnings are gone.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Root cause: login now returns user data and sets an httpOnly cookie, so these integration tests were storing undefined bearer tokens after successful login and then returning early from auth failures.
- Added deterministic test JWT fallback for categories/events integration auth setup, including tenantId and sessionVersion.
- Hardened category create controller to return 400 for invalid contestId format instead of surfacing a Prisma error as 500.
- Updated category delete assertion to verify the current soft-delete contract via deletedAt.
- Verified: npm run test:integration -- --runTestsByPath tests/integration/events.test.ts tests/integration/categories.test.ts -> 2 suites passed, 32 tests passed, no category/event auth skip warnings.
- Verified: npm run build and npm run test:typecheck both exited 0.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed backend integration dummy-pass auth fallbacks for event and category creation tests.

Changes:
- Updated events/categories integration tests to mint deterministic test JWTs when login succeeds via cookie-only response and no token is present in the body.
- Removed auth retry branches that logged skip warnings and returned early.
- Added category contestId format validation so invalid IDs return 400 instead of a Prisma-backed 500.
- Aligned category delete verification with the intended soft-delete behavior.

Verification:
- npm run test:integration -- --runTestsByPath tests/integration/events.test.ts tests/integration/categories.test.ts -> 2 passed, 32 tests passed, no dummy-pass warnings
- npm run build -> passed
- npm run test:typecheck -> passed
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
