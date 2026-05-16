---
id: TASK-93
title: Complete remaining dynamic permissions remediation
status: To Do
assignee: []
created_date: '2026-05-16 20:29'
updated_date: '2026-05-16 20:37'
labels:
  - permissions
  - authorization
  - frontend
  - backend
  - remediation
milestone: m-0
dependencies: []
references:
  - docs/operations/DYNAMIC-CRUD-PERMISSIONS-AUDIT.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finish the remaining remediation work identified after TASK-74 and the first-wave implementation in TASK-77 so tenant-configurable permissions become coherent across live backend authorization, permissions-management operations, and frontend navigation/page-policy behavior. This umbrella task tracks the remaining implementation gaps that still leave parts of the product partially governed by hardcoded role checks or incomplete permissions-management tooling. Operation-specific permission scopes already have a separate follow-up in TASK-78 and should not be duplicated here unless a dependency needs to be called out explicitly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Create and track implementation subtasks that cover the remaining backend/frontend authorization alignment work, permissions-management API/UI completion work, and navigation/page-policy consistency remediation.
- [ ] #2 Ensure the scoped follow-up work explicitly references the authority gaps documented in the dynamic CRUD permissions audit and does not duplicate TASK-78 operation-specific scope work.
- [ ] #3 Define completion for this umbrella task as all remediation subtasks being delivered or otherwise superseded by clearly linked follow-up tasks.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
