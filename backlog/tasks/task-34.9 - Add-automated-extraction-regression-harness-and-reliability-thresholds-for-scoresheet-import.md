---
id: TASK-34.9
title: >-
  Add automated extraction regression harness and reliability thresholds for
  scoresheet import
status: To Do
assignee: []
created_date: '2026-05-17 19:43'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a repeatable validation harness for Phase 1 scoresheet import so template calibration can be measured and protected against regression. This task should compare extracted criterion values against the annotated ground-truth dataset, compute row-level accuracy metrics, and enforce explicit reliability thresholds for supported templates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A repeatable validation harness exists that runs the scoresheet extractor against the annotated sample corpus and reports row-level accuracy for each supported template family.
- [ ] #2 Target reliability thresholds are defined for supported templates, including exact-match score extraction expectations and failure conditions that block rollout.
- [ ] #3 The calibration and release process can detect extraction regressions before shipping changes to supported scoresheet templates.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
