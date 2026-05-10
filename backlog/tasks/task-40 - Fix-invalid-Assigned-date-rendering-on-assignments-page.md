---
id: TASK-40
title: Fix invalid Assigned date rendering on assignments page
status: To Do
assignee: []
created_date: '2026-05-10 01:18'
updated_date: '2026-05-10 01:19'
labels: []
milestone: m-1
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The assignments page still displays an epoch date such as 12/31/1969 for some rows in Production. Investigate the timestamp source and rendering logic for each assignment type, then ensure the page shows a real assigned date when available and a clear placeholder when it is not.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The assignments page uses the correct timestamp source for each assignment type.
- [ ] #2 Rows without a valid assignment timestamp do not render 12/31/1969 or other epoch/default dates and instead show a clear placeholder.
- [ ] #3 The behavior is verified across judges, contestants, tally masters, and auditors.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
