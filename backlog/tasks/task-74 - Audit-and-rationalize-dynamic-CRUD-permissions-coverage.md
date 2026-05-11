---
id: TASK-74
title: Audit and rationalize dynamic CRUD permissions coverage
status: To Do
assignee: []
created_date: '2026-05-11 04:30'
updated_date: '2026-05-11 04:30'
labels:
  - permissions
  - audit
  - architecture
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit the current dynamic CRUD permissions system and document where it is authoritative, where it only affects frontend visibility, and where hardcoded role gates still bypass tenant-configurable permissions.

Relevant findings from the deductions audit to preserve:
- Dynamic permissions are seeded from DEFAULT_ROLE_PERMISSIONS and currently do not create first-class deductions permission rows for normal tenants.
- The permissions UI only exposes resources that actually exist in returned permission rows; describing a resource in the frontend is not enough to make it tenant-editable.
- Some page policies, including /deductions, are mapped to scores rather than a dedicated resource, which can make the settings model misleading.
- Active backend routes commonly still use requireRole(...) middleware, which means tenant CRUD settings may not control the live API even when page visibility appears permission-aware.
- Organizer and Board access can be partially shaped by frontend page-policy CRUD read overrides, but that is not the same as full backend authorization control.

The goal of this task is to produce a concrete inventory of the dynamic permissions system, identify misleading or partial integrations, and define the remediation path so tenant permission settings reflect real system behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inventory the dynamic permissions pipeline end-to-end: default seeding, backend permission reads, permissions UI exposure, frontend page-policy enforcement, and backend API/middleware enforcement.
- [ ] #2 Identify resources and routes where tenant-configurable permissions are fully authoritative versus partially applied or bypassed by hardcoded role checks.
- [ ] #3 Document gaps where a page policy points at the wrong resource or where a resource is described in the UI but not actually seeded or enforceable for tenants.
- [ ] #4 Produce a prioritized remediation recommendation for making dynamic CRUD permissions coherent, including whether to seed additional resources, replace hardcoded gates, or intentionally mark some routes as hard-protected.
- [ ] #5 Include a follow-up check for navigation consistency so nav visibility does not imply access that tenant permissions cannot actually grant or deny.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
