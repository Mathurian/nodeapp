---
id: TASK-19.21
title: Restore workflow DR scoring and commentary integration flows
status: To Do
assignee: []
created_date: '2026-05-01 01:33'
labels:
  - tests
  - integration
  - backend
  - api
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The TASK-19.4 rerun still has multi-step workflow, DR automation, scoring, commentary, and structure-copy integration failures. These suites mix route drift, missing idempotency/tenant setup, expected status mismatches, and real service errors. Use `temp/task-19.4-integration-after-users.json` and `temp/task-19.4-failure-digest.txt` as the starting evidence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Workflow, DR automation, scoring, commentary, and structure-copy failures are triaged into concrete root causes with response/body evidence.
- [ ] #2 Covered offline-write routes include valid idempotency keys where the current API requires them.
- [ ] #3 Targeted reruns for the affected files pass or remaining failures are split into smaller follow-up tasks with reproduction commands.
- [ ] #4 Full integration rerun records updated counts and no QueueService/Prisma teardown regression.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
