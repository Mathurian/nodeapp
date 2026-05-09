---
id: TASK-22
title: Scope category cloning contest selection by event
status: To Do
assignee: []
created_date: '2026-05-09 20:31'
updated_date: '2026-05-09 20:45'
labels:
  - cloning
  - frontend
  - backend
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the category cloning flow so tenant admins and organizers can clearly choose the destination event and then choose a destination contest within that event. Today the destination contest selector exposes all contests in the tenant, which makes cross-event category cloning hard to parse and easy to misuse. The flow should add a destination event selector that scopes the available destination contests for the category clone target.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 During category cloning, tenant admins and organizers can select a destination event before selecting the destination contest.
- [ ] #2 After a destination event is selected, the destination contest selector only shows contests that belong to that event instead of showing all tenant contests.
- [ ] #3 Category cloning within the same event continues to work, and cloning into a contest outside the selected destination event is blocked by validation.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
