---
id: TASK-19.19
title: Align integration tests with current auth and response contracts
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
After TASK-19.4 fixed tenant fallback and real JWT/bcrypt behavior, residual integration failures remain where tests expect outdated response wrappers, status codes, or token-in-body behavior. Representative files include reports, settings, advancedReporting, roleAssignment, winners, performance, and archive in `temp/task-19.4-integration-after-users.json`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Residual tests that expect body tokens, old wrappers such as mandatory `data`, or obsolete status codes are updated to the current API contract or removed with documented rationale.
- [ ] #2 Reports/settings/advancedReporting/roleAssignment/winners/performance/archive targeted reruns pass or produce narrower follow-up tasks with exact evidence.
- [ ] #3 Assertions continue to verify meaningful response shape and behavior rather than accepting broad dummy status arrays.
- [ ] #4 Full integration rerun records updated counts and no QueueService/Prisma teardown regression.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
