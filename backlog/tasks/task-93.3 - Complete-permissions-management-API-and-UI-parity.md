---
id: TASK-93.3
title: Complete permissions management API and UI parity
status: To Do
assignee: []
created_date: '2026-05-16 20:30'
updated_date: '2026-05-16 20:37'
labels:
  - permissions
  - admin-ui
  - api
  - frontend
  - backend
  - remediation
milestone: m-0
dependencies: []
references:
  - docs/operations/DYNAMIC-CRUD-PERMISSIONS-AUDIT.md
parent_task_id: TASK-93
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Close the remaining gaps between the live permissions-management backend surface and the admin UI/client contract so tenant administrators have a coherent, fully supported management experience. This includes either implementing or intentionally retiring the currently implied but not fully wired permissions-management capabilities, while preserving role restrictions, auditability, and the v1 scope-aware model from TASK-77 without duplicating TASK-78 operation-specific scope work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inventory the permissions-management capabilities currently exposed or implied by the admin UI/client contract and classify each as supported, missing, or intentionally out of scope.
- [ ] #2 Implement or intentionally remove unsupported permissions-management operations so the frontend and backend expose the same authoritative set of capabilities.
- [ ] #3 Ensure any supported permission-management operations enforce the existing tenant, role, and audit-log constraints consistently.
- [ ] #4 Update the admin-facing permissions experience and supporting documentation so operators are not presented with unsupported or misleading controls.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
