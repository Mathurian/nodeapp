---
id: TASK-19.18
title: Fix remaining integration Prisma setup tenant errors
status: To Do
assignee: []
created_date: '2026-05-01 01:33'
labels:
  - tests
  - integration
  - backend
  - database
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The TASK-19.4 integration rerun still has Prisma runtime `Cannot read properties of undefined (reading split)` failures in suites that create tenant-scoped records without complete required tenant/setup data. Representative files include `tests/integration/assignments.test.ts` and `tests/integration/contests.test.ts`; see `temp/task-19.4-integration-after-users.json` and `temp/task-19.4-failure-digest.txt`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Remaining Prisma `split` runtime failures in integration suites are traced to concrete missing/invalid setup fields and replaced with explicit valid test data or clear expected validation assertions.
- [ ] #2 Affected suites such as assignments and contests pass targeted reruns or have any unsupported paths split into narrower tasks with evidence.
- [ ] #3 Test setup helpers are reused where appropriate so tenant-scoped model creation consistently includes tenant context.
- [ ] #4 Full integration rerun records updated counts and no QueueService/Prisma teardown regression.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
