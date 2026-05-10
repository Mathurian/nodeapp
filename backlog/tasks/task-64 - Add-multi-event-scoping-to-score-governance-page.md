---
id: TASK-64
title: Add multi-event scoping to score governance page
status: To Do
assignee: []
created_date: '2026-05-10 23:00'
updated_date: '2026-05-10 23:01'
labels:
  - frontend
  - score-governance
  - scoping
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow users assigned to multiple events to choose an event and scope visible contests, categories, judges, and related governance data accordingly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The score governance page shows an event selector for users who can access multiple events, and hides or defaults it predictably for single-event users.
- [ ] #2 Contest, category, judge, and related governance data are filtered by the selected event so users do not see cross-event options or records.
- [ ] #3 Changing the selected event updates dependent selectors and results consistently without stale data leaking between scopes.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
