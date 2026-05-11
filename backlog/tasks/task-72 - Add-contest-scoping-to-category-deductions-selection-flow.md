---
id: TASK-72
title: Add contest scoping to category deductions selection flow
status: To Do
assignee: []
created_date: '2026-05-11 04:15'
updated_date: '2026-05-11 04:16'
labels: []
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Adjust the deductions workflow so category selection is narrowed by contest selection instead of presenting all categories across all contests, improving the category deduction UX and reducing cross-contest noise.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When creating or filtering category-level deductions, users can select a contest before selecting a category.
- [ ] #2 The category selector is scoped to the selected contest and no longer shows unrelated categories from other contests.
- [ ] #3 Existing event scoping and user access rules in the deductions flow continue to work correctly after the UX change.
- [ ] #4 The updated deductions selection flow is covered by focused frontend and/or backend verification.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
