---
id: TASK-93.1
title: Align remaining permission-aware route families with backend enforcement
status: To Do
assignee: []
created_date: '2026-05-16 20:30'
updated_date: '2026-05-16 20:37'
labels:
  - permissions
  - authorization
  - backend
  - frontend
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
Finish the remaining authorization alignment work for route families and application surfaces that are still permission-aware in frontend policy or navigation but continue to rely primarily on hardcoded backend role gates. This follow-up should build on TASK-77 and TASK-81, exclude route families already aligned in the first wave, and focus on making tenant-configurable permissions authoritative or intentionally hybrid for the remaining targeted surfaces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Identify the remaining permission-aware route families that still diverge between frontend page-policy visibility and backend authorization, excluding surfaces already aligned by TASK-77, TASK-73, and TASK-81.
- [ ] #2 Implement and document the intended enforcement model for each targeted family: fully tenant-configurable, hybrid with a fixed role boundary plus permission checks, or intentionally hard-protected.
- [ ] #3 Update backend route enforcement for the targeted families so direct API access and frontend page visibility resolve from the same authority model for the supported roles.
- [ ] #4 Run focused verification for the remediated route families covering allowed, denied, and direct-URL/API access behavior.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
