---
id: TASK-34.14
title: Add capture-quality gating and review-burden metrics for scoresheet import
status: To Do
assignee: []
created_date: '2026-05-18 16:39'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the scoresheet-import path reject weak inputs earlier and measure whether the review flow is actually saving operator effort compared with delegated entry.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The import path defines and enforces capture-quality gates for supported Education uploads, including conditions that should fail fast into delegated entry instead of producing misleading drafts.
- [ ] #2 The review workflow records or reports operational burden metrics such as incorrect rows, ambiguous rows, and manual corrections per sheet so rollout decisions can be based on operator effort.
- [ ] #3 The supported and unsupported upload conditions are documented clearly enough for operators to know when to use scoresheet import and when to fall back immediately.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
