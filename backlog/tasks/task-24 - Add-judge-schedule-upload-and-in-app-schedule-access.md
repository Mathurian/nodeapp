---
id: TASK-24
title: Add judge schedule upload and in-app schedule access
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-09 20:32'
updated_date: '2026-05-10 04:16'
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
- [ ] #1 Admins or organizers can upload judge schedule data using a documented supported format.
- [ ] #2 Judges can access their schedule in the application, and authorized staff can review uploaded schedule data.
- [ ] #3 The feature validates malformed uploads and provides clear feedback for import errors or unsupported schedule rows.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a tenant-scoped judge schedule storage model and migration so uploaded schedule rows can be linked to a judge plus optional event, contest, and category context.
2. Add backend schedule import/read APIs using CSV as the supported upload format, including row-level validation, clear import errors, and staff access to review imported schedule data.
3. Add an admin/organizer UI to upload a schedule CSV and review imported rows, plus a judge-facing in-app schedule view scoped to the signed-in judge.
4. Add targeted backend/frontend tests and run focused verification before closing the task.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
