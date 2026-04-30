---
id: TASK-19.10
title: Fix root frontend test script mismatch
status: To Do
assignee: []
created_date: '2026-04-30 13:37'
labels:
  - tests
  - frontend
  - ci
  - package-scripts
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
npm run test:frontend failed because the root script runs cd frontend && npm run test, but the frontend package does not define a test script. The command is currently a broken release gate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm run test:frontend runs a real frontend test command or is renamed/removed with package scripts updated consistently
- [ ] #2 The frontend package exposes the intended test entrypoint, or root package.json points to existing visual and accessibility commands explicitly
- [ ] #3 The command no longer fails with Missing script: test
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
