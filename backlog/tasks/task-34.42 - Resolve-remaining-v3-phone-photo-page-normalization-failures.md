---
id: TASK-34.42
title: Resolve remaining v3 phone-photo page normalization failures
status: Done
assignee:
  - '@codex'
created_date: '2026-05-26 16:51'
updated_date: '2026-05-26 18:35'
labels:
  - scoring
  - ocr
  - uat
  - calibration
dependencies: []
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a second-pass page-polygon and rotation-aware normalization path for the v3 phone-photo corpus images that still reject after TASK-34.40. The goal is to decide whether remaining captures can be normalized reliably or should be rejected early as capture-quality failures before mark scoring.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 IMG_5153.jpeg, IMG_5156.jpeg, IMG_5157.jpeg, and IMG_5159.jpeg either accept v3 geometry with zero geometry warnings or produce a specific capture-quality rejection reason instead of generic fiducial failure.
- [x] #2 IMG_5158.jpeg is classified as low-light/unreadable if geometry cannot be recovered, with metadata that explains the rejection.
- [x] #3 The parser does not regress IMG_5152.jpeg, IMG_5154.jpeg, IMG_5155.jpeg, synthetic v3 tests, or scanner/calibration samples.
- [x] #4 The follow-up keeps the certification gate conservative: uncertain geometry cannot produce high-confidence score rows.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the current v3 phone-photo diagnostics for the listed passing and failing images so the changes are measured against the same corpus.
2. Inspect the existing v3 fiducial/page-normalization code paths and diagnostic metadata to separate recoverable rotation/polygon failures from true capture-quality failures.
3. Implement the smallest conservative second-pass improvement needed: either recover geometry with zero warnings for the remaining usable captures, or emit specific capture-quality rejection reasons such as low light, cropped/edge anchors, or excessive perspective/rotation.
4. Add or update focused regression coverage for the failing images, the already-passing phone captures, synthetic v3 tests, and scanner/calibration samples where available.
5. Run targeted TypeScript/build/Jest diagnostics, update Backlog notes and acceptance criteria, and leave uncertain geometry rejected so certification cannot receive high-confidence rows from bad normalization.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added structured `captureQualityRejection` metadata to v3 fiducial detection, fiducial metadata, and diagnostic reports.
- Remaining phone-photo geometry failures now classify as specific capture-quality rejections: IMG_5153 canonical_anchor_unreadable; IMG_5156/5157/5159 version_strip_unreadable; IMG_5158 low_light_unreadable.
- Added an early low-light exit before expensive fiducial candidate scanning so unreadable dark captures reject quickly and conservatively.
- Aligned the v3 synthetic fixture painter in the calibration regression harness with the current v3 renderer/parser version-strip coordinates.
- Verification: IMG_5152/5154/5155 still accept geometry with zero warnings. Focused Jest v3 tests pass. `npm run test:scoresheet-import:calibration` remains overall FAIL because the historical Education v1 calibration is below threshold and the real phone-photo v3 sample remains manual-fallback; v3 synthetic samples now exact-match 4/4 with zero false high-confidence marks.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented conservative v3 page-normalization failure classification for real phone-photo uploads.

Changes:
- Added structured `captureQualityRejection` metadata to v3 fiducial detection, machine-readable fiducial metadata, and diagnostic reports.
- Classified remaining failed corpus captures with specific rejection reasons instead of generic fiducial failure: canonical anchor unreadable, version strip unreadable, and low-light/unreadable.
- Added an early low-light rejection path before expensive fiducial candidate scanning.
- Added focused unit coverage for low-light and unreadable-version-strip rejection cases.
- Updated the calibration regression v3 synthetic fixture painter to use the current renderer/parser version-strip coordinates.

Verification:
- `npx tsc --noEmit`
- `npx jest tests/unit/services/ScoreSheetImportService.test.ts --runInBand --testNamePattern "v3 diagnostic|v3 fiducials|low-light|version-strip|v3 phone upload"`
- `npm run build`
- standard v3 corpus diagnostic over IMG_5152-IMG_5159
- `node --check scripts/ops/score-sheet-import-regression.js`
- `git diff --check`

Calibration note:
- `npm run test:scoresheet-import:calibration` still exits FAIL due the existing Education v1 threshold miss and the real phone-photo v3 sample remaining manual-fallback. The v3 synthetic samples now exact-match 4/4 with zero false high-confidence marks, and the certification gate remains conservative.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
