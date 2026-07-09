---
id: TASK-109
title: Allow bulk user upload rows to assign multiple contests or categories
status: To Do
assignee: []
created_date: '2026-07-09 04:23'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the bulk user CSV import flow so a single uploaded user row can assign the created user to multiple contests and/or multiple categories in one import operation, while keeping current single-value behavior backward compatible.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Bulk user upload supports assigning one imported user row to multiple contests in a supported CSV field format
- [ ] #2 Bulk user upload supports assigning one imported user row to multiple categories in a supported CSV field format
- [ ] #3 Current single contestId/categoryId imports remain backward compatible
- [ ] #4 Importer returns clear row-level validation errors for malformed, ambiguous, or partially invalid multi-assignment values
- [ ] #5 CSV template and user guidance document the supported multi-assignment format and precedence rules
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
