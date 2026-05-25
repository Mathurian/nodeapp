---
id: TASK-34.30
title: Validate v3 scoresheet assurance and rollout policy
status: Done
assignee:
  - '@codex'
created_date: '2026-05-25 16:40'
updated_date: '2026-05-25 20:05'
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
Run the v3 machine-readable scoresheet pipeline through synthetic fixtures and any available scanner samples, then decide whether review-required, auto-submit, or auto-certify bands are empirically justified. The validation must account for the ignored commentary region and keep v1/current sheets outside v3 assurance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The calibration harness reports exact row match, exact sheet match, ambiguous rows, rejected rows, false high-confidence marks, total delta, and runtime for v3 sheets.
- [x] #2 The rollout policy defines explicit assurance thresholds for review-required, auto-submit, and auto-certify bands, with auto-certification disabled unless v3 evidence meets the required band.
- [x] #3 The evaluation compares v3 import effort against same-user manual entry and documents go/no-go guidance for operators.
- [x] #4 v1/current sheets remain routed to review-required or manual fallback and are not accidentally given v3 assurance.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the existing scoresheet regression/UAT harness and reliability policy docs to identify the smallest extension point for v3 evidence.
2. Add v3 synthetic calibration coverage using the generated v3 fixture geometry, including exact row/sheet match, ambiguous rows, rejected rows, false high-confidence marks, total delta, and runtime.
3. Add rollout-policy output for v3 review-required, auto-submit, and auto-certify bands, with auto-certification disabled unless evidence meets the configured threshold.
4. Ensure current/v1 sheets remain outside v3 assurance and continue to require review or manual fallback.
5. Update docs/backlog notes with go/no-go guidance comparing v3 import effort against same-user manual entry.
6. Run focused harness/tests/build checks and record evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Extended scripts/ops/score-sheet-import-regression.js with an education_omr_v3 assurance section using synthetic generated v3 sheets, commentary-scribble samples, multi-mark rejection, and missing-mark rejection.
- Added v3 metrics to the harness: exact row/sheet match, ambiguous rows, rejected rows, unexpected rejected rows, false high-confidence marks, total delta, runtime, and same-user manual-entry comparison.
- Added machineReadableThresholds.education_omr_v3 to route66-phase1-thresholds.json for review-required, auto-submit, and auto-certify bands.
- Updated reliability/phase1 docs to define v3 as the approved machine-readable target, with review-required-only current guidance and auto-certify disabled until real scanner evidence meets thresholds.
- Final v3 synthetic calibration result: 100% exact row match, 100% exact sheet match, 2 expected rejected rows, 0 unexpected rejected rows, 0 false high-confidence marks, total delta sum 0, ~70.64ms average runtime, 95% estimated row reduction versus same-user manual entry.
- Full calibration command currently exits 1 because legacy education_saturday_day_v1 scanner calibration is 48.3% exact-row match against the existing 50% threshold; the v3 section itself meets the review-required band and explicitly does not grant v3 assurance to v1/current sheets.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Validated the approved v3 machine-readable scoresheet assurance path and rollout policy.

Changes:
- Extended the scoresheet regression harness with an education_omr_v3 validation section covering clean v3 sheets, commentary scribbles below the grid, multi-mark rejection, and missing-mark rejection.
- Added v3 reporting for exact row match, exact sheet match, ambiguous rows, rejected rows, unexpected rejected rows, false high-confidence marks, total delta, runtime, and same-user manual-entry comparison.
- Added machineReadableThresholds.education_omr_v3 to the threshold packet for review-required, auto-submit, and auto-certify bands.
- Updated operations docs so v3 is the approved machine-readable target, v1/current sheets remain outside v3 assurance, and auto-certification stays disabled unless real scanner/UAT evidence meets the auto-certify band.

Evidence:
- V3 synthetic validation: 100% exact row match, 100% exact sheet match, 2 expected rejected rows, 0 unexpected rejected rows, 0 false high-confidence marks, total delta sum 0, about 70.64ms average runtime, and 95% estimated row reduction versus same-user manual entry.
- Policy result: GO for controlled review-required v3 UAT; NO-GO for auto-submit; NO-GO for auto-certification.
- Legacy guard: education_omr_v3 is explicit/detected only, while criteria-only inference remains education_saturday_day_v1.

Tests:
- jq . tests/examples/scoresheet-import/route66-phase1-thresholds.json
- node --check scripts/ops/score-sheet-import-regression.js
- node --check scripts/ops/generate-score-sheet-v3-fixtures.js
- npx jest tests/unit/services/ScoreSheetImportService.test.ts --runInBand
- npx jest tests/unit/utils/scoreSheetV2Renderer.test.ts tests/unit/utils/scoreSheetV3Renderer.test.ts tests/unit/services/PrintService.test.ts --runInBand
- npm run build
- git diff --check

Known result:
- node scripts/ops/score-sheet-import-regression.js --mode=calibration now reports the v3 section successfully but exits 1 because the legacy v1 Education scanner path is currently 48.3% exact-row match against its existing 50% calibration threshold.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
