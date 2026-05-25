---
id: TASK-34.33
title: Implement v3 fiducial perspective normalization for phone-photo imports
status: Done
assignee:
  - '@codex'
created_date: '2026-05-25 22:58'
updated_date: '2026-05-25 23:34'
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
Use the v3 sheet anchors to make real phone-photo imports viable. The current pipeline fails IMG_5145.jpeg because the whole phone frame is normalized and the skewed sheet remains inside it. Add backend fiducial detection, perspective correction, and v3-specific bubble sampling so real captures can be evaluated before investing in upload conversion or universal UI rollout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The v3 import path detects all four printed anchors in real phone-photo captures and rejects cleanly with quality-gate metadata when anchors are missing or unreliable.
- [x] #2 Detected anchors are used to crop and perspective-correct the sheet to the v3 canonical page coordinate system before score extraction.
- [x] #3 V3 score extraction samples known bubble centers from canonical coordinates rather than depending on legacy grid-line sequence anchoring for phone-photo captures.
- [x] #4 The IMG_5145.jpeg Daddie Danger / Retro sample is added to the v3 regression evaluation with its production-backed Education ground truth.
- [x] #5 Regression output reports exact row match, rejected rows, false high-confidence marks, total delta, anchor quality, and whether the sheet is accepted for review or rejected for retry/manual entry.
- [x] #6 Existing scanner/PDF Education import behavior and reviewed-draft workflow remain unchanged unless explicitly improved by the new v3 path.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preserve the current scanner/PDF path and isolate v3 phone-photo behavior behind machine-readable v3 normalization.
2. Add v3 fiducial detection on normalized/raw image data: find dark square components, choose four page anchors, score geometry/size confidence, and surface failure reasons in quality metadata.
3. Add a canonical perspective warp using the detected anchors so the sheet maps into the existing 1000 x 1400 page coordinate system before v3 extraction.
4. Add a v3 direct bubble-center sampler that uses known row/column geometry after perspective correction, so phone-photo extraction does not depend on legacy line-sequence anchoring.
5. Add IMG_5145.jpeg to the regression harness with Daddie Danger / Retro ground truth and report exact rows, rejected rows, false high-confidence marks, total delta, anchor quality, and quality-gate routing.
6. Add focused unit/regression coverage and run build plus targeted scoresheet import tests to verify existing Education scanner/PDF behavior does not regress.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Implementation approved; beginning backend v3 fiducial normalization and phone-photo regression work.

- Implemented v3 fiducial detection, perspective correction, and direct bubble-center scoring in ScoreSheetImportService.
- Added IMG_5145.jpeg to the v3 regression path with Daddie Danger / Retro ground truth.
- Verification: npm run build passed; focused Jest suites passed; node temp/evaluate-v3-phone-photo.cjs returned 10/10 exact rows and total 48 for standard/Otsu/fixed_150.
- Full calibration harness still exits FAIL because the legacy Education v1 scanner/PDF corpus remains below its existing threshold; the new v3 assurance section passed 5/5 sheets at 100% exact row match, including the real phone photo.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented backend v3 phone-photo normalization for machine-readable scoresheet imports.

Changes:
- Added v3 fiducial detection with quality metadata and clean rejection when anchors are missing.
- Added perspective correction to canonical v3 page coordinates and a v3-only direct bubble-center sampler.
- Preserved the existing scanner/PDF Education path and reviewed-draft workflow.
- Extended the regression harness with v3 synthetic checks plus the real IMG_5145.jpeg Daddie Danger / Retro phone-photo sample.
- Updated the corpus intake README with pre/post TASK-34.33 phone-photo results.

Tests:
- npm run build
- npx jest tests/unit/services/ScoreSheetImportService.test.ts tests/unit/utils/scoreSheetV3Renderer.test.ts --runInBand
- node temp/evaluate-v3-phone-photo.cjs
- node scripts/ops/score-sheet-import-regression.js --mode=calibration (expected overall FAIL from pre-existing legacy v1 threshold miss; v3 section passed 5/5 sheets, including IMG_5145 at 10/10 rows and total 48/48)
- git diff --check
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
