---
id: TASK-19.5
title: Restore backend contract test suite baseline
status: To Do
assignee: []
created_date: '2026-04-30 13:36'
labels:
  - tests
  - contracts
  - backend
  - api
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The backend contract suite ran 5 suites and 35 tests. Auth contracts passed, but scoring, certifications, users, and events contracts failed, mostly because setup hit the same users.boardRole schema drift. The contract suite still needs its own validation after the shared schema fix.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm run test:contracts executes all contract suites and exits successfully
- [ ] #2 Scoring, certifications, users, events, and auth contract suites all pass
- [ ] #3 Contract failures caused by shared environment setup are documented separately from schema/assertion mismatches
- [ ] #4 The final contract result records passed and failed counts from the JSON reporter
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
