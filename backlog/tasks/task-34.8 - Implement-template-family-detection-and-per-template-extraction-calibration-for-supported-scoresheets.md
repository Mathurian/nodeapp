---
id: TASK-34.8
title: >-
  Implement template-family detection and per-template extraction calibration
  for supported scoresheets
status: To Do
assignee: []
created_date: '2026-05-17 19:42'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current generic detector assumptions with explicit template-family support for the scoresheet formats intended for Phase 1. This task should add reliable template identification or selection, per-template anchor logic, row and column calibration, and extraction behavior tuned against the annotated sample corpus.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The import pipeline can identify or explicitly select the supported scoresheet template family before extraction begins.
- [ ] #2 Per-template alignment and score-cell mapping are implemented for the intended Phase 1 scoresheet families, rather than relying on one generic row map.
- [ ] #3 Extraction behavior is recalibrated against the annotated sample corpus and materially reduces the false-positive and total-mismatch failures seen in TASK-34.5.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
