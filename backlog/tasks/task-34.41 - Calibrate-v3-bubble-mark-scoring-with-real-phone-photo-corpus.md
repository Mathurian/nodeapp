---
id: TASK-34.41
title: Calibrate v3 bubble mark scoring with real phone-photo corpus
status: To Do
assignee: []
created_date: '2026-05-26 04:13'
labels:
  - scoring
  - ocr
  - uat
  - calibration
dependencies:
  - TASK-34.40
  - TASK-34.29
  - TASK-34.36
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tune v3 bubble scoring only after page normalization is inspectable and stable. The goal is to explain and fix why visible marks on the same physical sheet can fall below the current mark threshold without introducing false high-confidence marks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 IMG_5152.jpeg through IMG_5159.jpeg are evaluated against known ground truth for the same sheet and reported with exact-row rate, ambiguous rows, total delta, rejected reasons, and false high-confidence marks.
- [ ] #2 Mark scoring changes are based on corpus evidence, not a blind global threshold reduction, and include safeguards for multi-mark, shadow, gridline, and neighboring-cell false positives.
- [ ] #3 The calibration report compares the current threshold behavior against the selected tuned behavior for standard and scan B/W preprocessing modes.
- [ ] #4 Existing scanner/synthetic v3 samples and the original setup photo do not regress in exact-row match rate or false high-confidence mark count.
- [ ] #5 TASK-34.36 rollout recommendation is updated to say whether v3 phone uploads are ready for reviewed import integration, still parse-only, or require template/capture changes.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
