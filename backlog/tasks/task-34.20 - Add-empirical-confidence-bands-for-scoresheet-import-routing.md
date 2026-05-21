---
id: TASK-34.20
title: Add empirical confidence bands for scoresheet import routing
status: To Do
assignee: []
created_date: '2026-05-21 20:41'
labels:
  - scoring
  - ocr
  - backend
  - calibration
dependencies:
  - TASK-34.18
  - TASK-34.19
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a confidence-band policy for scoresheet imports that combines empirical calibration, extractor confidence, and extractor consensus where available so review bypass only occurs when measured reliability supports it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The import pipeline classifies each extraction into auto-certify, auto-submit, full-review, or rejected bands using empirically validated calibration results rather than raw extractor confidence alone.
- [ ] #2 The confidence policy supports thresholds of 99 percent or higher for auto-certification, 95 percent to below 99 percent for auto-submit with manual certification, and below 95 percent for full review, while allowing the feature to remain disabled if calibration cannot prove the band.
- [ ] #3 The calibration harness reports eligibility rates for each band plus exact row match, exact sheet match, incorrect rows per page, false high-confidence marks, and rejected upload rate.
- [ ] #4 Auto-certification remains disabled unless the empirical calibration version proves the 99 percent band on supported samples.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
