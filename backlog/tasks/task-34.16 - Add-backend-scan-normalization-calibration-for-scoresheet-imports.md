---
id: TASK-34.16
title: Add backend scan normalization calibration for scoresheet imports
status: Done
assignee:
  - '@codex'
created_date: '2026-05-21 19:13'
updated_date: '2026-05-21 19:45'
labels:
  - scoring
  - ocr
  - backend
dependencies: []
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a backend-first black-and-white scan normalization stage to the scoresheet upload-to-scored pipeline and prove, through the Education calibration harness, whether it improves extraction reliability before any client-side capture investment. This is related to TASK-34.14 capture-quality/review-burden metrics and TASK-34.15 Education grid anchoring/mark detection reliability, but keeps the reviewed-draft workflow unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ScoreSheetImportService can evaluate a scan-normalized preprocessing mode before score extraction, including grayscale conversion, contrast normalization, thresholded black-and-white output, and conservative despeckle or line-preservation tuning where supported.
- [x] #2 Draft extraction payloads include preprocessing metadata such as preprocessingMode, thresholdStrategy, and quality signals without treating imported scores as accepted results before human review.
- [x] #3 The Education calibration or UAT harness compares the current pipeline against scan-normalized and threshold-variant runs using row-level exact match, incorrect rows per page, ambiguous rows per page, total delta, and false high-confidence marks.
- [x] #4 The selected preprocessing mode is only adopted when it materially improves supported Education extraction reliability and regression checks prevent it from making the supported Education template worse.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add explicit preprocessing mode types and metadata to ScoreSheetImportService so the existing normalized pipeline remains the baseline and a scan-normalized black-and-white variant can be evaluated safely. 2. Implement scan normalization after document-bound extraction/resizing with grayscale, contrast normalization, thresholded black-and-white output, and conservative quality signals such as dark-pixel ratio and threshold strategy. 3. Preserve the reviewed-draft workflow by only adding preprocessing metadata to extraction payloads and keeping draft status/acceptance semantics unchanged. 4. Update the Education regression and UAT harnesses to run baseline plus scan-normalized threshold variants, report exact row match, incorrect rows/page, ambiguous rows/page, total delta, and false high-confidence marks, and fail if the selected mode regresses supported Education calibration. 5. Add focused unit coverage for metadata and scan-normalized detection behavior, then run targeted service tests, TypeScript build, and scoresheet import calibration.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started TASK-34.16, reviewed the service normalization/extraction path and the regression/UAT harness entry points, and recorded the implementation plan before coding.

Implemented explicit standard and scan_bw preprocessing modes in ScoreSheetImportService, including grayscale contrast normalization, black-and-white threshold strategies, conservative isolated-pixel despeckling, and extraction payload metadata.

Expanded calibration and UAT harnesses to compare standard against Otsu and fixed-threshold scan-normalized variants while reporting incorrect rows/page, ambiguous rows/page, total delta, and false high-confidence marks.

Calibration retained the standard preprocessing path because all scan-normalized variants regressed the current Education corpus; client-side capture work remains gated.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented backend scan-normalization evaluation for scoresheet imports while keeping the reviewed-draft workflow unchanged. Added explicit preprocessing metadata to extraction payloads, including preprocessingMode, thresholdStrategy, and qualitySignals, and exposed scan_bw evaluation through ScoreSheetImportService options.

Changes: added grayscale/contrast/threshold scan normalization with conservative isolated-pixel cleanup; extended the Education calibration harness to compare standard, Otsu, and fixed-threshold variants with correction-burden metrics; expanded the UAT harness to report the same variant comparison across clean and synthetic phone-style captures; added unit coverage for preprocessing metadata and scan-normalized mark detection.

Results: targeted ScoreSheetImportService unit tests passed, npm run build passed, npm run test:scoresheet-import:calibration passed, and npm run test:scoresheet-import:uat passed. Calibration retained the standard preprocessing path because scan-normalized variants were worse on the supported Education corpus, so scan preprocessing was not adopted as the default.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
