---
id: TASK-34.19
title: Implement selected self-hosted current-sheet extraction pipeline
status: To Do
assignee: []
created_date: '2026-05-21 20:40'
labels:
  - scoring
  - ocr
  - backend
dependencies:
  - TASK-34.18
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current low-reliability scoresheet mark extraction path with the best self-hosted current-sheet approach identified by TASK-34.18, preserving the existing paper format unless benchmarking proves a form change is unavoidable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The extractor preserves the current Education scoresheet format and does not require anchors or score-box redesign unless benchmark evidence explicitly shows current-sheet extraction cannot meet the reliability target.
- [ ] #2 The extractor uses stronger registration and mark detection than ink-density scoring alone, such as grid registration, printed-line suppression, connected components, local mark classification, or extractor consensus as selected by the benchmark.
- [ ] #3 The extraction payload records extractor family, calibration version, confidence band inputs, consensus results where available, and rejection gates triggered.
- [ ] #4 Calibration improves materially over the current clean-scan baseline and does not increase false high-confidence wrong marks.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
