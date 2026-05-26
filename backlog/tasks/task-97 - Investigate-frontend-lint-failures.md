---
id: TASK-97
title: Investigate frontend lint failures
status: To Do
assignee: []
created_date: '2026-05-26 02:36'
labels:
  - frontend
  - lint
  - tech-debt
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and resolve or document the current full frontend lint blockers found while completing TASK-34.35. The known failures are a jsx-a11y label association issue in frontend/src/pages/JudgeSchedulesPage.tsx and a parsing error in frontend/temp/task70_scroll_probe.mjs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Running cd frontend && npm run lint reproduces or confirms the current lint state.
- [ ] #2 JudgeSchedulesPage label association failure is fixed or documented with a justified follow-up if it is not safe to change immediately.
- [ ] #3 frontend/temp/task70_scroll_probe.mjs is fixed, excluded, removed, or otherwise handled according to repository expectations without deleting user-needed artifacts.
- [ ] #4 Full frontend lint passes, or any remaining unrelated blockers are explicitly documented in the task notes.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
