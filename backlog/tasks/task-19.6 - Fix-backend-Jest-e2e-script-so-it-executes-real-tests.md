---
id: TASK-19.6
title: Fix backend Jest e2e script so it executes real tests
status: To Do
assignee: []
created_date: '2026-04-30 13:36'
labels:
  - tests
  - e2e
  - backend
  - ci
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
npm run test:e2e invoked Jest with tests/e2e but exited with No tests found because the Jest configuration ignores /tests/e2e/ and .e2e.test.ts files. The command is currently a failing release gate and does not execute coverage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm run test:e2e either runs the intended Jest e2e tests or is replaced with a correctly named script
- [ ] #2 The command no longer fails with No tests found under the normal repository configuration
- [ ] #3 If Jest e2e coverage is intentionally retired in favor of Playwright, package scripts and documentation reflect that clearly
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
