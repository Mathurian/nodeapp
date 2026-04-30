---
id: TASK-19.11
title: Restore frontend lint baseline
status: To Do
assignee: []
created_date: '2026-04-30 13:37'
labels:
  - tests
  - lint
  - frontend
  - a11y
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
frontend npm run lint scanned the React app and failed with 854 problems: 291 errors and 563 warnings. Error categories include jsx-a11y label and interactive element issues, unused eslint-disable directives, no-useless-escape, no-namespace, and noninteractive tabindex usage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 cd frontend && npm run lint exits successfully with --max-warnings 0
- [ ] #2 Accessibility lint errors are fixed with semantic controls and associated labels rather than suppressions
- [ ] #3 Unused eslint-disable and no-useless-escape errors are removed or corrected
- [ ] #4 Any remaining rule suppressions include narrow justification
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
