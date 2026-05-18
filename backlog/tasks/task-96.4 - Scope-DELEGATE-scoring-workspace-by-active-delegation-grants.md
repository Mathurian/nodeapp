---
id: TASK-96.4
title: Scope DELEGATE scoring workspace by active delegation grants
status: To Do
assignee: []
created_date: '2026-05-18 19:43'
labels: []
dependencies: []
parent_task_id: TASK-96
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tighten the DELEGATE scoring experience so users without active grants do not browse broad scoring scope, and granted delegates only see the event, contest, category, and represented-judge options covered by current delegation grants.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A DELEGATE user without an active applicable grant does not see broad event, contest, or category scoring scope and is guided toward the missing-grant state.
- [ ] #2 A DELEGATE user with active grants only sees the events, contests, categories, and represented judges covered by those grants.
- [ ] #3 Delegated scoring remains functional for valid grants, including score entry, score-file usage, and delegated certification when separately allowed.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
