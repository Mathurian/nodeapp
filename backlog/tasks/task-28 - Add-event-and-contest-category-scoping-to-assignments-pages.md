---
id: TASK-28
title: Add event and contest/category scoping to assignments pages
status: To Do
assignee: []
created_date: '2026-05-09 20:35'
updated_date: '2026-05-09 21:00'
labels:
  - assignments
  - frontend
  - filters
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expand the assignments pages so assignment data can be scoped by event and by contest or category, instead of forcing a broader or flatter view. This should make assignment administration usable at the right operational level.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Assignments pages provide filters or scope controls for event, contest, and category where those scopes are applicable.
- [ ] #2 Changing scope updates the displayed assignment data consistently across supported assignment tabs without leaking records outside the selected scope.
- [ ] #3 The selected scope is reflected in requests and preserved predictably during navigation or refresh where the existing UX supports persisted filters.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
