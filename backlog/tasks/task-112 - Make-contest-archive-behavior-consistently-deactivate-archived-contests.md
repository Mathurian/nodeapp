---
id: TASK-112
title: Make contest archive behavior consistently deactivate archived contests
status: To Do
assignee: []
created_date: '2026-07-09 16:57'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Archiving a contest currently only toggles the contest.archived flag. The parent event and sibling contests remain active, which is expected, but the archived contest can still expose operational child data like categories because many downstream reads only check deletedAt or event archive state. Align archive semantics so an archived contest behaves consistently as inactive throughout the app while remaining restorable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Archived contests are excluded from downstream operational reads that should only surface active contests, including contest child navigation and category retrieval, unless an explicit archived view is requested.
- [ ] #2 Archive and unarchive behavior for contests is documented and covered by backend tests so archived contests remain restorable without soft-delete side effects.
- [ ] #3 UI surfaces archived contests only in explicit archived views and no longer treats archived contests as active in standard workflows.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
