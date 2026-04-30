---
id: TASK-19.3
title: Align test database schema with Prisma user boardRole field
status: Done
assignee:
  - '@codex'
created_date: '2026-04-30 13:36'
updated_date: '2026-04-30 17:27'
labels:
  - tests
  - prisma
  - database
  - backend
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Integration and contract suites failed at setup because Prisma queries referenced users.boardRole but the active test database does not have that column. This schema drift blocked user creation, auth lookup, and most API-level test setup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The test database schema includes the user boardRole field expected by the generated Prisma client
- [x] #2 Prisma migrations or test setup reliably prepare the schema before integration, contract, and e2e tests run
- [x] #3 A targeted Prisma user create and AuthService user lookup succeed in the test environment
- [x] #4 The fix documents whether the issue was migration drift, stale database state, or generated-client mismatch
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm the drift source by comparing Prisma schema/migration files with the active test database metadata.
2. Reuse the existing test database setup script as the canonical schema preparation step, adjusting it only if needed so it recreates the configured test database and runs Prisma migrations against that database.
3. Wire schema preparation into backend commands that require a real database: the root split Jest runner before integration/contract execution, plus npm scripts for integration, contract, and Jest e2e slices.
4. Add a focused verification script or test that creates a user with boardRole and exercises AuthService lookup against the prepared test database.
5. Run test DB setup, the targeted Prisma/AuthService verification, and a small integration/contract smoke command to confirm users.boardRole is present and the prior schema error is gone.
6. Record whether the issue was migration drift, stale database state, or generated-client mismatch, then check AC/DoD and add a final summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Confirmed Prisma schema and checked-in migrations contain users.boardRole plus events.requireAllTallyCertifiers/events.requireAllAuditorCertifiers, while the active event_manager_test database had none of those columns.
- Confirmed the active test database also lacked _prisma_migrations, so the immediate failure was stale/disposable test database state rather than generated-client mismatch.
- Attempted scripts/test-db-setup.sh with prisma migrate deploy; it failed from an empty test DB because the checked-in migration history assumes pre-existing baseline tables such as contests. Updated disposable test setup to use prisma db push, matching the older test runner behavior for test databases.
- Wired database preparation into the root split Jest runner and database-backed npm scripts for integration, contract, and Jest e2e slices.
- Added tests/integration/testDatabaseSchema.test.ts to verify required columns, create a BOARD user with boardRole, and confirm AuthService.login reads boardRole.
- Verification passed: bash -n scripts/test-db-setup.sh; bash -n scripts/test-backend-jest.sh; npm run build; bash scripts/test-db-setup.sh; targeted schema/AuthService Jest test 2/2; prepared runner path with the targeted test 2/2.
- Contract smoke with tests/contracts/auth.contract.test.ts reached the prepared database and failed on existing /api/v1/auth/login contract response mismatch, not missing boardRole schema.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned disposable backend test database setup with the current Prisma schema so integration and contract setup no longer fail on missing users.boardRole.

Changes:
- Updated scripts/test-db-setup.sh to refuse non-test database names, recreate the configured test DB, push the current Prisma schema with prisma db push, and verify users.boardRole plus event certification policy columns are present.
- Updated scripts/test-backend-jest.sh with an optional --prepare-db mode and made plain npm test prepare the DB before split integration/contract/unit execution.
- Wired npm run test:integration, npm run test:contracts, and npm run test:e2e through the prepared runner path.
- Added tests/integration/testDatabaseSchema.test.ts to verify required schema columns, create a BOARD user with boardRole, and confirm AuthService.login reads the boardRole value.

Root cause:
The checked-in Prisma schema already had the fields and the generated client expected them. The active event_manager_test database was stale and had no _prisma_migrations table. The repository migration history also is not bootstrappable into an empty test DB because it assumes older baseline tables already exist, so disposable test setup now uses db push instead of migrate deploy.

Verification:
- bash -n scripts/test-db-setup.sh: passed.
- bash -n scripts/test-backend-jest.sh: passed.
- npm run build: passed.
- bash scripts/test-db-setup.sh: passed and verified required columns.
- npm test -- --runTestsByPath tests/integration/testDatabaseSchema.test.ts --runInBand: passed 2/2.
- bash scripts/test-backend-jest.sh --prepare-db --runTestsByPath tests/integration/testDatabaseSchema.test.ts --runInBand: passed 2/2.

Residual:
A prepared contract smoke for tests/contracts/auth.contract.test.ts failed on the existing /api/v1/auth/login response contract mismatch, not on missing boardRole schema.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
