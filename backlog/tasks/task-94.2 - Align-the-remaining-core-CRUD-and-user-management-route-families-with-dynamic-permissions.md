---
id: TASK-94.2
title: >-
  Align the remaining core CRUD and user-management route families with dynamic
  permissions
status: To Do
assignee: []
created_date: '2026-05-16 22:17'
updated_date: '2026-05-16 22:22'
labels:
  - permissions
  - authorization
  - backend
  - frontend
milestone: m-0
dependencies: []
parent_task_id: TASK-94
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finish the backend and frontend alignment work for the core CRUD surfaces that are still mostly governed by hardcoded roles even though they already expose tenant-manageable resources in page policy or default permissions. This includes the remaining events, contests, categories, users, assignments, results, winners, bulk operations, and related user-management workflows that still present a split authority model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Route families for the remaining core CRUD surfaces enforce the intended dynamic or hybrid permission model in the backend instead of relying on frontend visibility plus hardcoded roles alone.
- [ ] #2 Frontend pages, navigation, and action affordances for those surfaces reflect the same authority model as the backend and no longer imply unsupported capabilities.
- [ ] #3 Verification covers allowed, denied, and direct API access behavior for the aligned surfaces so tenant-configurable CRUD updates from /permissions materially affect them.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
