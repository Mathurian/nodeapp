---
id: TASK-19.4
title: Restore backend integration test suite baseline
status: To Do
assignee: []
created_date: '2026-04-30 13:36'
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
The backend integration slice ran 54 suites and 535 tests; all 535 failed. The dominant blocker was the missing users.boardRole column, with cascading undefined setup objects and queue worker noise. After schema alignment, the suite needs a focused rerun and any remaining failures fixed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm run test:integration executes real tests and exits successfully
- [ ] #2 All integration suites pass, or any remaining failures are split into new focused tasks with evidence
- [ ] #3 The final integration result records suite and test counts from the JSON reporter
- [ ] #4 Integration setup does not leave QueueService workers or Prisma clients running after tests complete
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
