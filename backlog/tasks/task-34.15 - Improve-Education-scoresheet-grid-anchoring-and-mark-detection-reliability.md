---
id: TASK-34.15
title: Improve Education scoresheet grid anchoring and mark detection reliability
status: To Do
assignee: []
created_date: '2026-05-18 16:39'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Increase extraction reliability for the first supported Education template family by strengthening template anchoring, score-cell localization, and mark detection against the real sample corpus.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The Education extractor uses stronger template anchoring than document-bounds-only normalization so row and score-cell windows are tied to printed form structure more reliably.
- [ ] #2 Mark detection is recalibrated against the supported Education mark styles and materially improves row-level exact-match accuracy on the shared calibration corpus.
- [ ] #3 The extraction service remains explicitly limited to supported templates and fails safely when the calibrated Education assumptions do not hold.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
