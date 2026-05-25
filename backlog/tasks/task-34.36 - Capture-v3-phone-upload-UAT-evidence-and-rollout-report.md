---
id: TASK-34.36
title: Capture v3 phone upload UAT evidence and rollout report
status: To Do
assignee: []
created_date: '2026-05-25 23:47'
labels:
  - scoring
  - ocr
  - uat
  - calibration
dependencies:
  - TASK-34.34
  - TASK-34.35
  - TASK-34.20
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Turn parse-only phone uploads into structured evidence for rollout decisions. The goal is to measure real capture reliability across repeated phone uploads before promoting v3 imports into the live reviewed-draft workflow or considering review removal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each parse-only UAT run can be exported or recorded with context, upload format, parser version, preprocessing mode, anchor quality, exact rows, total delta, rejected rows, false high-confidence marks, and quality-gate decision.
- [ ] #2 The regression or reporting harness can ingest UAT evidence and report phone-photo sheet count separately from synthetic and scanner evidence.
- [ ] #3 The report distinguishes parser failures, upload conversion failures, missing ground truth, expected rejected rows, and true extraction mismatches.
- [ ] #4 The rollout recommendation keeps auto-submit and auto-certify disabled unless the empirical evidence thresholds in TASK-34.20 are met.
- [ ] #5 The report includes a clear go/no-go recommendation for moving from parse-only UAT to reviewed import integration.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
