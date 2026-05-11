---
id: TASK-77
title: Implement end-to-end dynamic permissions and configurable scope overhaul
status: To Do
assignee: []
created_date: '2026-05-11 20:55'
updated_date: '2026-05-11 20:56'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the broader permissions overhaul identified by TASK-74 so tenant-manageable permissions become coherent across frontend visibility, backend authorization, navigation behavior, and data scope. This follow-on should extend the current action-based permission model with configurable scope concepts where appropriate, rationalize page-resource mappings, seed first-class resources consistently, and replace partial or misleading integrations with a documented end-to-end model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Define the target permissions architecture for action permissions plus configurable scope, including how scope is stored, read, and enforced for tenant-manageable resources.
- [ ] #2 Expand the permissions data model and seeding strategy so first-class resources used by the app can be managed consistently by tenant admins, including any new scope-aware policy data required by the architecture.
- [ ] #3 Adopt the target model across a prioritized set of route families so frontend page/nav behavior and backend authorization use the same source of truth instead of diverging hardcoded role checks.
- [ ] #4 Provide an admin-facing management approach for scope-aware permissions, whether through the existing Permissions UI or a dedicated configuration surface, with clear rules for hard-protected versus tenant-configurable pages.
- [ ] #5 Add verification and documentation that demonstrate how action permission, scope, navigation visibility, and API enforcement stay aligned after the overhaul.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
