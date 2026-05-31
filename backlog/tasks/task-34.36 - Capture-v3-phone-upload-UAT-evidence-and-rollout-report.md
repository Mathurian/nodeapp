---
id: TASK-34.36
title: Capture v3 phone upload UAT evidence and rollout report
status: Done
assignee:
  - '@codex'
created_date: '2026-05-25 23:47'
updated_date: '2026-05-27 00:44'
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
- [x] #1 Each parse-only UAT run can be exported or recorded with context, upload format, parser version, preprocessing mode, anchor quality, exact rows, total delta, rejected rows, false high-confidence marks, and quality-gate decision.
- [x] #2 The regression or reporting harness can ingest UAT evidence and report phone-photo sheet count separately from synthetic and scanner evidence.
- [x] #3 The report distinguishes parser failures, upload conversion failures, missing ground truth, expected rejected rows, and true extraction mismatches.
- [x] #4 The rollout recommendation keeps auto-submit and auto-certify disabled unless the empirical evidence thresholds in TASK-34.20 are met.
- [x] #5 The report includes a clear go/no-go recommendation for moving from parse-only UAT to reviewed import integration.
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

- TASK-34.41 added a conservative multi-candidate v3 scorer: standard remains primary, while scan-normalized fallback candidates can win only if they preserve baseline accepted rows and any newly accepted rows are confirmed by another candidate.
- Updated phone-photo calibration result: IMG_5155 now reaches 10/10 exact rows in standard mode with total delta 0 and zero false high-confidence marks, but the eight-photo corpus remains far below reviewed-import readiness.
- Current recommendation remains parse-only. Do not promote v3 phone uploads into reviewed import integration yet; more capture/template changes or stronger upload guidance are still required.

- Extended the v3 rollout/report harness to include the full approved phone-photo corpus: IMG_5145 plus IMG_5152 through IMG_5159. The report now records 9 phone-photo sheets separately from 4 synthetic sheets.
- Added exported per-sample evidence fields for context, upload metadata, parserVersion, selected preprocessing mode, threshold strategy, anchor quality, exact-row counts, total delta, rejected rows, false high-confidence marks, and quality-gate decision.
- Added failureCategories/failureReasons for parser geometry, mark rejections, quality-gate blocks, unexpected rejections, and true extraction mismatches, plus skipCategory support for missing ground truth or upload/conversion failures.
- Corrected the v3 manual-attention comparison so ambiguous rows are not double-counted as both ambiguous and incorrect.
- Verified updated report from /tmp/task-34.36-report.json: machineReadableV3 evidence = 4 synthetic + 9 phone-photo sheets, exact-row-match 44.6%, exact-sheet-match 38.5% (5/13), false high-confidence marks 0, unexpected rejected rows 71, skipped phone photos 0, recommendedBand manual_fallback, go/no-go NO-GO beyond manual fallback.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated the v3 rollout-report harness so parse-only UAT evidence now reflects the full approved phone-photo corpus and produces a clear no-go recommendation.

Changes:
- Extended machine-readable v3 reporting from a single phone photo to the full IMG_5145 and IMG_5152-IMG_5159 corpus.
- Added exported per-sample context, upload metadata, parser version, preprocessing/threshold selection, anchor quality, exact-row counts, total delta, rejected rows, false high-confidence marks, and quality-gate decision.
- Added explicit failure categories and skip categories so the report can distinguish parser geometry failures, mark rejections, quality-gate blocks, upload/conversion failures, missing ground truth, and true extraction mismatches.
- Fixed the manual-entry comparison metric to count unique rows requiring attention instead of double-counting ambiguous rows.

Results:
- The v3 rollout report now shows 13 sheets of evidence: 4 synthetic and 9 phone-photo.
- Aggregate v3 metrics are 44.6% exact-row match, 38.5% exact-sheet match, 0 false high-confidence marks, and recommendedBand manual_fallback.
- No phone-photo samples were skipped, and the report’s go/no-go remains NO-GO for rollout beyond manual fallback.

Recommendation:
- Keep v3 phone uploads parse-only. Do not start TASK-34.37 yet. Continue with phone-photo hardening work in TASK-34.40 before revisiting reviewed-import promotion.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
