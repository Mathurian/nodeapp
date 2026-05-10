---
id: TASK-65
title: Audit and fix score deductions scoping and contest selection
status: To Do
assignee: []
created_date: '2026-05-10 23:00'
updated_date: '2026-05-10 23:01'
labels:
  - frontend
  - deductions
  - scoping
  - investigation
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the deductions UX so it follows the same event-aware scoping pattern as score governance where applicable, and investigate whether the inability for a1@okckinkweekend.com to select a contest in production is expected permissions behavior or a defect.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The score deductions flow exposes event selection where users can operate across multiple events, and downstream contest or category options are scoped to the selected event.
- [ ] #2 The current production behavior blocking contest selection for a1@okckinkweekend.com is reproduced or ruled out, and the task documents whether it is expected authorization behavior or a bug.
- [ ] #3 If the contest selection behavior is a bug, the fix restores predictable contest selection without widening access beyond the user’s allowed scope.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
