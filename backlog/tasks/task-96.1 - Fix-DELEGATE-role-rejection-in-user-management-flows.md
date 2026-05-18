---
id: TASK-96.1
title: Fix DELEGATE role rejection in user management flows
status: Done
assignee:
  - '@codex'
created_date: '2026-05-18 18:45'
updated_date: '2026-05-18 18:53'
labels: []
dependencies: []
parent_task_id: TASK-96
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove remaining hardcoded user-management role allowlists that reject the new DELEGATE role after TASK-96 deployment.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Creating a user with role DELEGATE succeeds through POST /api/v1/users when the requester otherwise has permission.
- [x] #2 Role-based user lookup and other user-management role validation surfaces accept DELEGATE consistently.
- [x] #3 Tests or targeted verification cover the DELEGATE creation path and prevent regression.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Patch the user-creation controller allowlist and the adjacent user-management role validation lists to include DELEGATE consistently.
2. Add focused regression coverage for the create-user path that currently returns 400.
3. Rebuild and run targeted tests, then redeploy the fix to production and verify DELEGATE user creation succeeds.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Found production 400 on POST /api/v1/users caused by a hardcoded role allowlist in usersController that omitted DELEGATE.
- Added DELEGATE to shared VALID_ROLES in src/constants/roles.ts and patched adjacent user-management allowlists in usersController, including create user, role lookup, bulk upload validation, and bulk template guidance.
- Added controller regression coverage for DELEGATE create-user and role-filter flows.
- Verified with npx jest tests/unit/controllers/usersController.test.ts --runInBand and npm run build.
- Deployed hotfix to production in release 20260518135215 and verified service health.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the remaining user-management role validation gap after TASK-96 so DELEGATE can be created and queried like other supported roles.

Changes:
- Added DELEGATE to shared role constants used by CSV and bulk user flows.
- Updated usersController hardcoded role validation for createUser, getUsersByRole, bulk upload validation, and bulk template guidance.
- Added regression tests covering DELEGATE user creation and role lookup.
- Deployed the hotfix to production as release 20260518135215.

Verification:
- npx jest tests/unit/controllers/usersController.test.ts --runInBand
- npm run build
- Production health check after deploy
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
