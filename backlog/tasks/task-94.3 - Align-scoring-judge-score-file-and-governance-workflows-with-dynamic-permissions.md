---
id: TASK-94.3
title: >-
  Align scoring, judge, score-file, and governance workflows with dynamic
  permissions
status: To Do
assignee: []
created_date: '2026-05-16 22:17'
labels:
  - permissions
  - authorization
  - scoring
  - backend
  - frontend
dependencies: []
parent_task_id: TASK-94
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Complete the permissions remediation for the scoring-adjacent workflows that remain the most operationally sensitive and the least fully dynamic today. This includes the primary scoring routes, judge-facing routes, score governance and uncertify flows, score removal workflows, score-file upload and access paths, and any related board, auditor, tally-master, or organizer surfaces that still rely on hardcoded role checks or overloaded score resources.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The scoring, judge, score-governance, score-removal, and score-file route families enforce the intended permission resources and operations in the backend, not just hardcoded role lists.
- [ ] #2 Frontend scoring-adjacent pages and actions are remapped to the canonical resources and only expose capabilities that the backend will honor.
- [ ] #3 The remediation explicitly covers supporting surfaces such as board, auditor, tally-master, and organizer workflows so the scoring authority model is coherent end to end.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
