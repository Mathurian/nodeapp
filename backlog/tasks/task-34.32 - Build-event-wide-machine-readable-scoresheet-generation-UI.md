---
id: TASK-34.32
title: Build event-wide machine-readable scoresheet generation UI
status: To Do
assignee: []
created_date: '2026-05-25 22:58'
labels:
  - scoring
  - frontend
  - print
dependencies: []
parent_task_id: TASK-34
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After v3 scoresheet import reliability is acceptable, replace the static Education-only editor with an authenticated UI for generating printable machine-readable score sheets across an event. The UI should support real event/contest/category/judge/contestant assignments and avoid hardcoded Education-only template behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authorized users can select an event, contest, one or more categories, assigned judges, and assigned contestants for score-sheet generation.
- [ ] #2 The UI generates v3 machine-readable sheets for selected judge/contestant/category combinations without hardcoding the Education category or education_omr_v3 editor page.
- [ ] #3 Batch generation supports practical full-contest printing or download with clear per-sheet identity metadata.
- [ ] #4 The UI rollout remains deferred until backend v3 normalization/import reliability reaches the agreed acceptance threshold.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
