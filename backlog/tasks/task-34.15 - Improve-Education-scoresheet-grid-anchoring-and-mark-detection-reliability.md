---
id: TASK-34.15
title: Improve Education scoresheet grid anchoring and mark detection reliability
status: Done
assignee:
  - '@codex'
created_date: '2026-05-18 16:39'
updated_date: '2026-05-22 20:20'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Increase extraction reliability for the first supported Education template family by strengthening template anchoring, score-cell localization, and mark detection against the real sample corpus.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The Education extractor uses stronger template anchoring than document-bounds-only normalization so row and score-cell windows are tied to printed form structure more reliably.
- [x] #2 Mark detection is recalibrated against the supported Education mark styles and materially improves row-level exact-match accuracy on the shared calibration corpus.
- [x] #3 The extraction service remains explicitly limited to supported templates and fails safely when the calibrated Education assumptions do not hold.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preserve the supported-template gate: keep extraction limited to education_saturday_day_v1 and unsupported categories failing safely.
2. Add stronger template anchoring metadata around detected grid line quality, including whether horizontal/vertical printed-line sequences were detected or fell back to static ratios.
3. Improve score-cell localization by using detected printed grid boundaries more defensibly and rejecting/flagging weak anchors rather than silently trusting bad geometry.
4. Recalibrate mark scoring against the 30-page scanner corpus by reducing printed-line edge contamination, increasing mark-specific signal, and lowering false high-confidence wrong marks.
5. Extend the regression harness output enough to compare standard vs alternate ground-truth corpora and capture anchoring/mark-detection metrics needed for TASK-34.15.
6. Run the default six-page calibration plus the expanded 30-page scanner corpus; accept changes only if row-level exact match improves without increasing false high-confidence marks or unsafe unsupported-template behavior.
7. Document the outcome in the task notes and leave any unresolved reliability gaps explicitly tied to the next calibration/rejection-gate work.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added grid anchoring metadata to extraction payloads: horizontal/vertical anchored flags, detected line counts, and fallback use. Unsupported/nonmatching templates still fail through the existing supported-template resolver.
- Reworked mark scoring into a hybrid path: row-level scoring excludes printed horizontal/vertical grid-line bands for noisy/faint marks, while focused cell-window scoring remains available for clear colored pen marks.
- Added alternate ground-truth support to scripts/ops/score-sheet-import-regression.js so the expanded 30-page scanner corpus can run without replacing the original fixture.
- Expanded scanner corpus result improved from the TASK-34.12 baseline: standard normalized image moved from 44.3% to 48.3% exact row match, incorrect rows/page from 5.57 to 5.17, max total delta from 33 to 18, and false high-confidence marks from 44 to 42.
- This is still not release-grade. The expanded corpus remains below the 50% calibration threshold and is not safe for auto-submit, auto-certification, or removing human review.
- The original six-page calibration source PDF was missing after cleanup; restored the ignored temp/DD_Scores copy.pdf from the uploaded Daddie Danger packet for local verification. That fixture still fails at 48.3% exact row match.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Improved Education scoresheet anchoring and mark detection enough to establish a better scanner-corpus baseline, but not enough to make the importer release-grade.

Changes:
- Added grid anchoring metadata to extraction payloads so calibration can tell whether horizontal/vertical printed line sequences were detected or fallback geometry was used.
- Replaced single-path cell scoring with hybrid mark scoring: row-level scoring excludes printed grid-line bands for noisy/faint marks, while focused cell-window scoring remains available for clear colored marks.
- Extended the regression harness to accept --ground-truth and per-sample sourcePdf values, allowing the new mixed-PDF scanner corpus to run directly.

Results:
- Expanded 30-page scanner corpus standard baseline improved from 44.3% to 48.3% exact row match.
- Incorrect rows/page improved from 5.57 to 5.17.
- Max total delta improved from 33 to 18.
- False high-confidence marks improved slightly from 44 to 42.

Limitations:
- Calibration still fails. The importer is still below the existing 50% calibration threshold on the expanded corpus.
- This does not justify auto-submit, auto-certification, or removing review.
- Further progress likely needs stronger registration/mark modeling rather than more threshold tuning.

Verification:
- npm run build
- node scripts/ops/score-sheet-import-regression.js --mode=calibration (expected failure; 48.3% exact row match)
- node scripts/ops/score-sheet-import-regression.js --mode=calibration --ground-truth=tests/examples/scoresheet-import/route66-2026-pet-education-scanner-ground-truth.json (expected failure; 48.3% exact row match)
- node --check scripts/ops/score-sheet-import-regression.js
- jq empty tests/examples/scoresheet-import/route66-2026-pet-education-scanner-ground-truth.json
- git diff --check
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
