---
id: TASK-93
title: Complete remaining dynamic permissions remediation
status: Done
assignee:
  - '@codex'
created_date: '2026-05-16 20:29'
updated_date: '2026-05-16 21:41'
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
- [x] #1 Create and track implementation subtasks that cover the remaining backend/frontend authorization alignment work, permissions-management API/UI completion work, and navigation/page-policy consistency remediation.
- [x] #2 Ensure the scoped follow-up work explicitly references the authority gaps documented in the dynamic CRUD permissions audit and does not duplicate TASK-78 operation-specific scope work.
- [x] #3 Define completion for this umbrella task as all remediation subtasks being delivered or otherwise superseded by clearly linked follow-up tasks.
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the remaining dynamic permissions remediation tracked under TASK-93.

Delivered subtasks:
- `TASK-93.2` aligned page-policy and navigation behavior with the actual authority model for the affected admin and self-service surfaces.
- `TASK-93.1` aligned the remaining clean backend route families and related frontend affordances for `tracker:*`, `files:*`, and `templates:*`.
- `TASK-93.3` cleaned up the permissions-management API/UI contract so the supported v1 admin surface now matches the live backend capabilities and role restrictions.

Follow-up:
- `TASK-78` remains the next separate permissions follow-up for operation-specific scope work and was not duplicated here.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
