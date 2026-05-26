---
id: TASK-34.36
title: Capture v3 phone upload UAT evidence and rollout report
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-25 23:47'
updated_date: '2026-05-26 04:07'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Run each new phone-photo UAT upload through the backend parser across standard and scan B/W threshold variants.
2. Record per-image best variant, accepted rows, ambiguous/rejected rows, quality-gate reasons, and fiducial failures.
3. Inspect representative captures and parser constants to classify failures as capture, fiducial/normalization, mark-threshold, or rollout-policy issues.
4. Summarize go/no-go recommendation before any integration promotion.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Evaluated IMG_5152.jpeg through IMG_5159.jpeg from temp/scoresheet-corpus-intake with standard, scan_bw_otsu, fixed_150, fixed_170, and fixed_190 variants. All eight remained manual_entry_required. Best accepted-row counts were 6/10, 3/10, 1/10, 4/10, 6/10, 0/10, 3/10, and 1/10 respectively. Dominant parser rejection reason was missing_mark; variant-level failures also showed unstable v3 fiducial detection under phone capture conditions.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
