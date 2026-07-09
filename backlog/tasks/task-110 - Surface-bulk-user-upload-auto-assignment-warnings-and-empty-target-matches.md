---
id: TASK-110
title: Surface bulk user upload auto-assignment warnings and empty target matches
status: To Do
assignee: []
created_date: '2026-07-09 16:45'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The bulk user CSV importer can currently report overall success even when post-create auto-assignment silently does nothing or fails. In particular, contest-based auto-assignment treats a contestId that resolves to zero categories as a success, and the UI only surfaces backend errors when failed rows are greater than zero. Add clearer backend validation and frontend reporting so admins can trust the bulk upload outcome.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Bulk upload returns a row-level warning or error when contestId/categoryId-based auto-assignment resolves to no assignment targets instead of silently succeeding.
- [ ] #2 Backend bulk upload results distinguish user-creation success from assignment/warning outcomes and expose assignment issues in the API response.
- [ ] #3 Bulk upload UI surfaces assignment warnings/errors even when no rows failed user creation.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
