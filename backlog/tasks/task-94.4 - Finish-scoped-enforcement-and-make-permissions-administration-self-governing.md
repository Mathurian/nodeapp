---
id: TASK-94.4
title: Finish scoped enforcement and make permissions administration self-governing
status: To Do
assignee: []
created_date: '2026-05-16 22:17'
labels:
  - permissions
  - authorization
  - scope
  - admin
dependencies: []
parent_task_id: TASK-94
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Close the remaining partial implementations where permission tokens exist but runtime scope filtering or permissions-management enforcement is still incomplete. This includes reports scope behavior, file-management scope filtering, and the /permissions management APIs themselves so the permissions surface is governed by the same authority model it edits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Scope-aware surfaces that are currently only partially enforced, including reports and file-management analytics or integrity paths, apply the resolved resource or operation scope at runtime where intended.
- [ ] #2 The permissions-management APIs and pages are governed by canonical permissions within their intended base-role boundary instead of role checks alone, so permissions administration is self-consistent.
- [ ] #3 Operator documentation and verification clearly describe which scope-aware resources are fully enforced, and any remaining fixed-role exceptions are explicit rather than implicit.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
