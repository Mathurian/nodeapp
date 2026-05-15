---
id: TASK-92
title: >-
  Investigate implementing true in-app tenant selection and multi-tenant account
  support
status: To Do
assignee: []
created_date: '2026-05-15 14:58'
updated_date: '2026-05-15 14:58'
labels:
  - auth
  - tenant
  - architecture
  - investigation
milestone: m-2
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate what it would take to support a first-class user experience where one authenticated person can intentionally select among multiple tenants from within the application, rather than relying on separate tenant-scoped accounts discovered only at default login. This task should determine whether the desired capability is product-valid, what data model and auth changes it would require, how it would interact with tenant segregation guarantees, and whether a secure implementation is feasible without undermining the current tenant isolation model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Define the intended product behavior for true tenant selection, including whether it means one user identity can hold membership in multiple tenants, switch tenants after login, or both.
- [ ] #2 Audit the current schema, auth, session, and tenant-middleware architecture to identify the gaps between the current tenant-scoped account model and a true multi-tenant membership/switching model.
- [ ] #3 Identify the security and tenant-segregation risks of supporting in-app tenant selection, including token scope, permission scope, audit logging, and cross-tenant data leakage concerns.
- [ ] #4 Outline the implementation approaches available, including data model changes, migration implications, UX surface changes, and backward-compatibility concerns.
- [ ] #5 Produce a recommendation on whether to pursue this capability and create follow-up tasks for any approved implementation path.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
