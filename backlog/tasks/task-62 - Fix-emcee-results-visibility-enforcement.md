---
id: TASK-62
title: Fix emcee results visibility enforcement
status: To Do
assignee: []
created_date: '2026-05-10 21:41'
updated_date: '2026-05-10 21:42'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the regression where emcees can still see or directly access View Results despite the intended visibility restrictions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Emcee users do not see the View Results navigation item when policy should hide it.
- [ ] #2 Emcee users cannot directly access the View Results page or API when policy should deny it.
- [ ] #3 Authorized roles retain expected access to the results experience after the fix.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
