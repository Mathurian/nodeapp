---
id: TASK-34.12
title: Collect real handset-photo corpus for Education scoresheet import calibration
status: To Do
assignee: []
created_date: '2026-05-18 16:39'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the first real handset-photo sample set for the Education scoresheet family so reliability tuning and UAT are based on representative uploads rather than only clean scans or synthetic phone-style variants.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A real handset-photo corpus is defined and collected for education_saturday_day_v1, including at least clear, borderline-but-supported, and clearly unsupported captures.
- [ ] #2 The corpus records the capture context needed for calibration, including device or image provenance, framing quality, skew or lighting notes, and the represented ground-truth criterion scores.
- [ ] #3 The sample packet is documented and wired into the existing regression or UAT workflow so later reliability work can measure against real uploads instead of synthetic assumptions.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
