---
id: TASK-96
title: Add first-class DELEGATE role for delegated scoring without over-assignment
status: Done
assignee:
  - '@codex'
created_date: '2026-05-18 16:50'
updated_date: '2026-05-18 18:17'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Introduce a dedicated DELEGATE role so delegated scoring and delegated certification can be granted through an appropriately scoped role instead of overloading BOARD or other unrelated roles just to satisfy base-role route and page guards.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A new DELEGATE role exists in the role model and seeded permission baseline with only the intended delegated-scoring and delegated-certification capabilities by default.
- [x] #2 Frontend page-access policy and backend route guards allow DELEGATE to reach the scoring and delegation-management surfaces required for its workflow without granting unrelated board, governance, or admin authority by default.
- [x] #3 The delegated scoring, delegated certification, and eligible-judge flows work end to end for DELEGATE users through active grants, while unsupported actions remain denied.
- [x] #4 Documentation is updated to describe when to use DELEGATE instead of BOARD or other existing roles for fallback score-entry operations.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the core role model to add a first-class DELEGATE role in Prisma and generated type surfaces, then seed a minimal default permission baseline focused on delegated scoring, delegated certification, score-file access, and delegation visibility without board or admin capabilities.
2. Update frontend page-access policy and backend fixed role guards so DELEGATE can reach the scoring and delegation-validation surfaces required for represented-judge selection, delegated score entry, delegated certification, and score-file handling, while keeping grant creation, revocation, governance approvals, and other unrelated admin or board flows closed.
3. Verify the delegated scoring service and UI assumptions against a non-judge DELEGATE actor so represented-judge selection, active-grant validation, and certification toggles still behave correctly without needing BOARD as a workaround.
4. Add or update focused tests for role access and delegated workflow behavior, then refresh the operator documentation to recommend DELEGATE as the proper fallback role instead of over-assigning BOARD or other roles.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added the DELEGATE role to the Prisma UserRole enum, generated client surfaces, and migration 20260518173000_task96_delegate_role.
- Seeded a minimal DELEGATE permission baseline for delegated scoring, delegated certification, score-file access, delegation visibility, and basic read surfaces without board or admin authority.
- Extended the scoring, score-file, commentary, and score-delegation route guards plus the frontend scoring page and route policies so DELEGATE can reach delegated scoring workflows without needing BOARD.
- Updated user-management, permission-management, and operator docs to expose DELEGATE as the recommended fallback role.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a first-class DELEGATE role so delegated scoring no longer depends on over-assigning BOARD.

Changes:
- Added DELEGATE to the Prisma UserRole enum, generated types, and migration 20260518173000_task96_delegate_role.
- Seeded a focused default permission baseline for DELEGATE in defaultPermissions, plus scope defaults and permission-management role visibility.
- Updated frontend page access, navigation, tenant routing, user creation role validation, and role-display lists so DELEGATE can sign in and reach /scoring as a real role.
- Updated backend fixed role guards on scoring, score files, commentary, and score-delegation routes so DELEGATE can perform represented-judge scoring and delegated certification through active grants while grant creation and revocation remain admin-only.
- Refreshed delegated-scoring docs to recommend DELEGATE instead of BOARD for fallback operators.
- Added focused test coverage proving a non-judge DELEGATE can submit on behalf of a represented judge and can complete delegated certification when permissions and safeguards allow it.

Verification:
- npx prisma generate
- npm run build
- cd frontend && npm run type-check
- cd frontend && npm run build
- npx jest tests/unit/services/ScoringService.test.ts --runInBand
- npx jest tests/unit/controllers/scoringController.test.ts -t "delegated certification" --runInBand
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
