---
id: TASK-24
title: Add judge schedule upload and in-app schedule access
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:32'
updated_date: '2026-05-10 04:35'
labels:
  - judges
  - scheduling
  - frontend
  - backend
milestone: m-0
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add support for judge schedules in the application, including an upload path and an in-app experience for viewing schedule data. The feature should define a supported upload format and make schedule information available to the intended users without requiring off-platform distribution.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admins or organizers can upload judge schedule data using a documented supported format.
- [x] #2 Judges can access their schedule in the application, and authorized staff can review uploaded schedule data.
- [x] #3 The feature validates malformed uploads and provides clear feedback for import errors or unsupported schedule rows.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a tenant-scoped judge schedule storage model and migration so uploaded schedule rows can be linked to a judge plus optional event, contest, and category context.
2. Add backend schedule import/read APIs using CSV as the supported upload format, including row-level validation, clear import errors, and staff access to review imported schedule data.
3. Add an admin/organizer UI to upload a schedule CSV and review imported rows, plus a judge-facing in-app schedule view scoped to the signed-in judge.
4. Add targeted backend/frontend tests and run focused verification before closing the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added tenant-scoped judge schedule storage with optional event, contest, and category links plus CSV import batch metadata.
- Added judge schedule service/controller/routes for CSV import, template download, staff review, and judge-scoped retrieval.
- Added Judge Schedules UI, navigation, dashboard shortcuts, and focused service/controller regression coverage.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented tenant-scoped judge schedules with CSV import, in-app staff review, and judge-facing schedule access.

Changes:
- Added a new JudgeScheduleEntry Prisma model and migration so schedule rows can be linked to judges with optional event/contest/category context and import batch metadata.
- Added backend judge schedule import/list/template endpoints with row-level CSV validation, tenant-scoped entity resolution, and judge-only access enforcement.
- Added a Judge Schedules frontend page, navigation, dashboard entry points, CSV template download, staff import feedback, and judge self-service schedule viewing.
- Added focused unit coverage for CSV validation/import behavior and controller access rules.

Verification:
- npx prisma generate
- npx jest tests/unit/services/JudgeScheduleService.test.ts tests/unit/controllers/judgeScheduleController.test.ts --runInBand
- npm run build
- cd frontend && npm run type-check
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
