---
id: TASK-94.2
title: >-
  Align the remaining core CRUD and user-management route families with dynamic
  permissions
status: Done
assignee:
  - '@codex'
created_date: '2026-05-16 22:17'
updated_date: '2026-05-17 02:28'
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
- [x] #1 Route families for the remaining core CRUD surfaces enforce the intended dynamic or hybrid permission model in the backend instead of relying on frontend visibility plus hardcoded roles alone.
- [x] #2 Frontend pages, navigation, and action affordances for those surfaces reflect the same authority model as the backend and no longer imply unsupported capabilities.
- [x] #3 Verification covers allowed, denied, and direct API access behavior for the aligned surfaces so tenant-configurable CRUD updates from /permissions materially affect them.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Align the remaining backend CRUD route families with canonical permission tokens by adding hybrid guards to the core `events`, `contests`, `categories`, `users`, `assignments`, `results`, and winners-related surfaces, using the existing resource taxonomy instead of introducing new permission resources unless the current mapping is demonstrably wrong.
2. Prioritize read and write coverage where frontend policy already advertises tenant-manageable access: `events:*`, `contests:*`, `categories:*`, `users:*`, `assignments:*`, and `results:*`; handle winners and send-email or bulk workflows according to their actual underlying resource ownership rather than leaving them role-only.
3. Remove the remaining frontend authority drift by updating `TenantRouter`, navigation config, and page affordances so route entry, nav visibility, and page actions follow the same policy model already expressed in `pageAccessPolicy`, instead of separate hardcoded admin-role lists.
4. Verify the aligned surfaces with backend and frontend build coverage plus focused allowed, denied, and direct API checks so `/permissions` updates materially affect the remaining core CRUD and user-management flows.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
