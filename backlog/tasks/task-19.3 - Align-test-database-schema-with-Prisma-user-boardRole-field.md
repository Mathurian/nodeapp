---
id: TASK-19.3
title: Align test database schema with Prisma user boardRole field
status: To Do
assignee: []
created_date: '2026-04-30 13:36'
labels:
  - tests
  - prisma
  - database
  - backend
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Integration and contract suites failed at setup because Prisma queries referenced users.boardRole but the active test database does not have that column. This schema drift blocked user creation, auth lookup, and most API-level test setup.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The test database schema includes the user boardRole field expected by the generated Prisma client
- [ ] #2 Prisma migrations or test setup reliably prepare the schema before integration, contract, and e2e tests run
- [ ] #3 A targeted Prisma user create and AuthService user lookup succeed in the test environment
- [ ] #4 The fix documents whether the issue was migration drift, stale database state, or generated-client mismatch
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
