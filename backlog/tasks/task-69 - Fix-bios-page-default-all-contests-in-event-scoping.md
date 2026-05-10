---
id: TASK-69
title: Fix bios page default all-contests-in-event scoping
status: To Do
assignee: []
created_date: '2026-05-10 23:01'
updated_date: '2026-05-10 23:01'
labels:
  - bios
  - frontend
  - scoping
  - bug
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Correct the shared Bios page behavior so when an event is selected and the secondary selector defaults to all contests in event, the page shows accurate user data for that scope instead of misleading or incomplete results.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When an event is selected on the shared Bios page and the secondary selector is all contests in event, the returned contestant, judge, and related user data accurately reflects that full event scope.
- [ ] #2 Default selector behavior after choosing an event is predictable and does not imply broader or narrower data than what is actually displayed.
- [ ] #3 Focused verification covers the event-level all-contests bios case so the shared scoping flow remains reliable for affected roles.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
