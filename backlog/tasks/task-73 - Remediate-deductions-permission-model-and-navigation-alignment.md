---
id: TASK-73
title: Remediate deductions permission model and navigation alignment
status: Done
assignee:
  - '@codex'
created_date: '2026-05-11 04:30'
updated_date: '2026-05-11 21:22'
labels:
  - permissions
  - deductions
  - audit
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use the deductions access audit to align the active /deductions flow with the intended dynamic permissions model and role-scoped behavior.

Audit findings to preserve for implementation:
- The active deductions UI uses the scoring-backed flow, not the legacy standalone deductions routes.
- Board and Auditor access in the active flow is logical and should remain supported.
- Judge and Tally Master access is currently broader than best practice because the active deductions list is not assignment-scoped; a judge can reach deduction records outside assigned categories if they can access /deductions.
- The frontend page policy for /deductions is currently tied to the scores resource instead of a dedicated deductions resource.
- The active backend deductions endpoints are still guarded by hardcoded requireRole(...) middleware, so tenant permission settings do not currently provide true end-to-end control of deductions access.
- The permissions UI can describe a deductions resource, but default tenant permission seeding does not currently create deductions permission rows, so normal tenant admins generally cannot manage deductions as a first-class resource.
- There is also a legacy/active mismatch between src/routes/deductionRoutes.ts and src/routes/scoringRoutes.ts that should be reconciled or retired.

This task should preserve Board and Auditor availability while tightening over-broad access and aligning page/API/nav behavior with the intended permission source of truth.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Define and implement the intended authorization model for the active deductions flow, preserving Board and Auditor access and explicitly deciding Judge and Tally Master capabilities by action (view/create/approve/reject).
- [x] #2 Align the active /deductions frontend page policy, navigation visibility, and backend API authorization with the same permission model so tenant-configured access behaves consistently end-to-end.
- [x] #3 Scope deductions data appropriately for limited roles such as Judge and Tally Master so they cannot browse tenant-wide deduction records outside their operational assignment scope unless explicitly intended.
- [x] #4 Reconcile or retire the legacy standalone deductions routes so there is a single authoritative deductions permission model.
- [x] #5 Investigate and ensure appropriate navigation items are present or absent based on actual deductions access after the permission model is corrected.
- [x] #6 Add focused verification covering role access, nav visibility, and API enforcement for Board, Auditor, Judge, Tally Master, Organizer/Admin, and denied roles.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Introduce a first-class `deductions` permission resource in the default permission model so tenant permission rows and the Permissions UI can manage deductions independently of `scores`.
2. Repoint the active `/deductions` frontend page policy and navigation behavior to the `deductions` resource, preserving the agreed fixed scope model for this task: Judge assignment-scoped, Tally Master assignment-scoped, Auditor assignment-scoped, Board event-wide, and Organizer/Admin/Super Admin tenant-wide.
3. Align the active scoring-backed deductions API to the same action model by enforcing `deductions:read`, `deductions:create`, `deductions:approve`, and `deductions:reject` on the live endpoints while keeping scope logic in the service/query layer.
4. Implement fixed deductions data scoping in the active flow so limited roles cannot browse tenant-wide records outside their allowed assignment or event boundary, while broad roles retain full access.
5. Reconcile or retire the legacy standalone deductions routes so both frontend and backend follow a single authoritative deductions permission model, then run focused verification for page access, nav visibility, API enforcement, and scoped data results across the affected roles.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added a first-class `deductions` permission resource to the default role matrix for Organizer, Board, Judge, Tally Master, and Auditor.
- Repointed `/deductions` page policy from `scores` to `deductions` and introduced `requireResourcePermission` so route/nav visibility now requires the actual deductions read token.
- Wired the active scoring-backed deductions endpoints to `requirePermission(...)` for read/create/approve/reject, while keeping intended role boundaries in place.
- Added controller-level deductions scope resolution: Judge, Tally Master, and Auditor are assignment-scoped by contest/category; Board is event-wide via active board role assignments; Organizer/Admin/Super Admin remain tenant-wide.
- Applied the same scope model to deductions list/query access, request creation, approval/rejection access checks, and scoring category option loading.
- Retired the legacy standalone deductions route registration from the live route table so the scoring-backed flow is the single active deductions surface.
- Verification: `npm run build` (backend), `cd frontend && npm run type-check`, `cd frontend && npm run build`, and `cd frontend && npx eslint src/pages/DeductionsPage.tsx src/config/pageAccessPolicy.ts src/utils/pageAccess.ts` all passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the deductions permissions remediation as the first vertical slice of the broader dynamic-permissions overhaul.

Changes:
- Seeded a first-class `deductions` resource in the default permission matrix and assigned explicit action capabilities by role.
- Repointed `/deductions` page/nav access to `deductions` instead of `scores`, with a new `requireResourcePermission` policy mode so intended roles still need the actual deductions read permission.
- Added deductions-specific `requirePermission(...)` middleware on the active scoring-backed deductions endpoints for read/create/approve/reject.
- Added controller-side scope enforcement so deductions visibility and mutation access now follow the agreed fixed model: Judge/Tally Master/Auditor assignment-scoped, Board event-wide, Organizer/Admin/Super Admin tenant-wide.
- Applied the same scope logic to the scoring categories feed used by the deductions request form to reduce option leakage for limited roles.
- Removed the legacy standalone `/deductions` route registration so the scoring-backed deductions flow is the single authoritative live surface.

Verification:
- `npm run build`
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`
- `cd frontend && npx eslint src/pages/DeductionsPage.tsx src/config/pageAccessPolicy.ts src/utils/pageAccess.ts`

Risks / follow-up:
- Scope values are still fixed in code for this task; tenant-manageable scope configuration remains in `TASK-77`.
- Board event-wide scope depends on active board role assignments being present for the events they should oversee.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
