---
id: TASK-73
title: Remediate deductions permission model and navigation alignment
status: To Do
assignee: []
created_date: '2026-05-11 04:30'
updated_date: '2026-05-11 04:30'
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
- [ ] #1 Define and implement the intended authorization model for the active deductions flow, preserving Board and Auditor access and explicitly deciding Judge and Tally Master capabilities by action (view/create/approve/reject).
- [ ] #2 Align the active /deductions frontend page policy, navigation visibility, and backend API authorization with the same permission model so tenant-configured access behaves consistently end-to-end.
- [ ] #3 Scope deductions data appropriately for limited roles such as Judge and Tally Master so they cannot browse tenant-wide deduction records outside their operational assignment scope unless explicitly intended.
- [ ] #4 Reconcile or retire the legacy standalone deductions routes so there is a single authoritative deductions permission model.
- [ ] #5 Investigate and ensure appropriate navigation items are present or absent based on actual deductions access after the permission model is corrected.
- [ ] #6 Add focused verification covering role access, nav visibility, and API enforcement for Board, Auditor, Judge, Tally Master, Organizer/Admin, and denied roles.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
