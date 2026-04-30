---
id: TASK-19.13
title: Evaluate skipped frontend accessibility tests
status: To Do
assignee: []
created_date: '2026-04-30 13:37'
labels:
  - tests
  - a11y
  - frontend
  - playwright
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
frontend npm run test:a11y passed 8 tests but skipped 3 authenticated-page accessibility tests for Dashboard, Events list, and Settings page. The command is not a dummy pass, but authenticated-page a11y coverage is incomplete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The three skipped authenticated accessibility tests are reviewed and classified as fix, keep skipped with rationale, remove, or replace
- [ ] #2 Authenticated-page accessibility tests run with reliable auth/setup, or the skip rationale is documented in the test code and backlog
- [ ] #3 cd frontend && npm run test:a11y records expected pass/skip counts after the decision
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
