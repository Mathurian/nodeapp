---
id: TASK-21
title: Implement bulk assignment removal workflow
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:30'
updated_date: '2026-05-09 21:11'
labels:
  - assignments
  - backend
  - frontend
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a true bulk assignment removal workflow for the assignments area instead of relying on per-row manual or fan-out deletes. Cover the assignment types exposed in the assignments UI and make the bulk action operationally safe, tenant-aware, and observable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Assignments UI supports removing multiple selected assignments in one action for each supported assignment type.
- [x] #2 Bulk removal uses dedicated backend orchestration or equivalent safe server-side handling instead of requiring users to remove items one by one.
- [x] #3 The operation returns clear success and failure results, preserves tenant boundaries, and logs bulk removal activity.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define the bulk removal contract and supported assignment types for the assignments UI.
2. Extend backend bulk assignment deletion so one endpoint can remove judge, contestant, tally master, and auditor assignments with tenant-safe validation, per-item handling, and bulk activity logging.
3. Update the assignments page to call the bulk endpoint for selected rows instead of issuing per-item delete requests, while preserving grouped-row expansion behavior.
4. Add or repair controller/frontend-adjacent tests for request validation, success/failure result reporting, and supported assignment types.
5. Run targeted tests and record the implementation summary, AC checks, and any residual limitations.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reviewed current state: bulk delete endpoint exists for judge assignment IDs only.
- Reviewed assignments UI: bulk remove still fans out individual requests for judges, contestants, tally masters, and auditors.
- Planning implementation around a unified backend contract plus frontend adoption.

- Implemented tenant-aware deletion checks in assignment removal service methods for judge, contestant, tally master, and auditor assignment records.
- Expanded the bulk assignment delete controller contract to support typed bulk removal for judges, contestants, tally masters, and auditors with structured partial-failure responses.
- Updated the assignments page bulk remove flow to call the bulk endpoint instead of fanning out per-item delete requests, and added focused controller tests for the new behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented a true bulk assignment removal workflow across the assignments UI and backend.

Changes:
- Extended bulk assignment deletion to support judge, contestant, tally master, and auditor assignment records through a typed bulk delete contract.
- Added tenant-aware deletion checks in assignment service methods so both bulk and single-delete flows reject cross-tenant targets.
- Switched the assignments page bulk remove path from client-side fan-out deletes to the bulk endpoint and surfaced structured success/partial-failure feedback.
- Replaced placeholder bulk controller tests with focused coverage for the new delete contract and updated assignment controller tests for tenant-scoped deletes.

Verification:
- npx jest tests/unit/controllers/BulkAssignmentController.test.ts tests/unit/controllers/assignmentsController.test.ts --runInBand
- frontend: npm run type-check
- frontend: npm run build
- backend: npm run build

Notes:
- npm run test:typecheck still fails in an unrelated existing file: tests/e2e/comprehensive/admin.e2e.test.ts due implicit any errors.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
