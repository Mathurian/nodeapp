---
id: TASK-34.30
title: Validate v2 scoresheet assurance and rollout policy
status: To Do
assignee: []
created_date: '2026-05-25 16:40'
labels:
  - scoring
  - ocr
  - calibration
dependencies:
  - TASK-34.29
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Run the v2 machine-readable scoresheet pipeline through synthetic fixtures and real scanner samples, then decide whether review-required, auto-submit, or auto-certify bands are empirically justified.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The calibration harness reports exact row match, exact sheet match, ambiguous rows, rejected rows, false high-confidence marks, total delta, and runtime for v2 sheets.
- [ ] #2 The rollout policy defines explicit assurance thresholds for review-required, auto-submit, and auto-certify bands, with auto-certification disabled unless v2 evidence meets the required band.
- [ ] #3 The evaluation compares v2 import effort against same-user manual entry and documents go/no-go guidance for operators.
- [ ] #4 v1/current sheets remain routed to review-required or manual fallback and are not accidentally given v2 assurance.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
