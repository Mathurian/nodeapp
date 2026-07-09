---
id: TASK-108
title: Allow bulk user upload contest/category fields to accept names or IDs
status: To Do
assignee: []
created_date: '2026-07-09 04:20'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the bulk user CSV import flow so contest/category assignment columns can be resolved from either internal IDs or human-readable names without breaking existing CSVs that already use IDs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Bulk user CSV import continues to accept existing contestId and categoryId values as internal IDs without regression
- [ ] #2 Importer can resolve human-readable contest and category values for assignment when provided in the supported CSV fields
- [ ] #3 Ambiguous or missing name matches fail with a clear row-level error instead of silently assigning the wrong scope
- [ ] #4 CSV template and import guidance document the supported assignment field formats and precedence rules
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
