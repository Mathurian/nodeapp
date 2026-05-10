---
id: TASK-61
title: Fix results page data loading regression
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 21:41'
updated_date: '2026-05-10 21:42'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the regression where the View Results page does not load the proper results data for authorized users after the latest visibility-policy release.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authorized users can load the results page and receive the expected event, contest, category, and results data.
- [ ] #2 The fix preserves published-results visibility restrictions for roles that should remain gated.
- [ ] #3 Regression coverage or targeted verification demonstrates the results data path works after the fix.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
