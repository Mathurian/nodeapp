---
id: TASK-34.28
title: Generate machine-readable scoresheet v2 print output
status: To Do
assignee: []
created_date: '2026-05-25 16:39'
labels:
  - scoring
  - ocr
  - forms
  - backend
dependencies:
  - TASK-34.27
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the printable v2 scoresheet output from the approved v2 contract with minimal disruption to current report/print flows. The generated sheet should remain human-readable while adding machine-readable anchors, identity metadata, and score mark regions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The print/report path can generate a v2 machine-readable scoresheet for supported categories without removing the existing v1/current scoresheet output.
- [ ] #2 The generated sheet includes stable registration anchors, template/version identity, page identity metadata, and score mark regions aligned to the v2 contract.
- [ ] #3 The output remains usable by judges with clear human-readable labels and minimal layout disruption.
- [ ] #4 Generated sample fixtures are saved for calibration and regression testing.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
