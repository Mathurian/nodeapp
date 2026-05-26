---
id: TASK-34.39
title: Add v3 phone-photo parser diagnostic overlays
status: Done
assignee:
  - '@codex'
created_date: '2026-05-26 04:12'
updated_date: '2026-05-26 04:37'
labels:
  - scoring
  - ocr
  - uat
  - calibration
dependencies:
  - TASK-34.36
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add debug artifacts for v3 phone-photo scoresheet parsing so real-world failures can be inspected visually instead of inferred from row metrics. This should explain why same-sheet captures diverge from the original v3 setup image before changing parser thresholds.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 UAT or regression evaluation can emit a normalized/warped sheet image for each uploaded v3 phone capture.
- [x] #2 Diagnostic output overlays detected fiducials, page bounds, score grid cells, selected cell per row, rejected rows, and rejection reasons.
- [x] #3 Per-row and per-cell ink scores are exported beside the overlay artifact so threshold behavior can be reviewed without stepping through code.
- [x] #4 The diagnostics distinguish geometry failures from mark-scoring failures for IMG_5152.jpeg through IMG_5159.jpeg.
- [x] #5 Diagnostic artifacts are written only to dev/temp or another ignored/temp location and are not retained as production score-file records.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Expose a dev-only v3 diagnostics path from ScoreSheetImportService that reuses the existing normalize/extract pipeline and returns the canonical image, fiducial metadata, grid geometry, per-row cell bounds, ranked ink scores, selected cells, and rejection reasons.
2. Add a temp/regression harness option for IMG_5152.jpeg through IMG_5159.jpeg that writes diagnostics under temp/scoresheet-corpus-intake/diagnostics, including normalized/warped PNGs and JSON sidecars.
3. Render overlay PNGs with fiducial markers, page/canonical bounds, score grid cells, selected cells, and rejected-row labels so we can inspect whether the same-sheet failure is geometry drift or mark scoring.
4. Add focused backend/unit coverage for the diagnostic payload shape without changing production import behavior.
5. Run the diagnostics on the eight new photos, inspect the artifacts, update TASK-34.39 notes/ACs, and summarize whether the next task should prioritize fiducials/page normalization or bubble scoring.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented a dev-only v3 diagnostic report builder on ScoreSheetImportService and a tracked diagnostics harness at scripts/ops/score-sheet-v3-diagnostics.js. The harness writes normalized, source-overlay, canonical, canonical-overlay, and JSON sidecar artifacts under temp/scoresheet-corpus-intake/diagnostics.

Ran diagnostics for IMG_5152.jpeg through IMG_5159.jpeg across standard, scan_bw_otsu, fixed_150, fixed_170, and fixed_190. Best variants still ranged from 0/10 to 6/10 accepted rows, all manual_entry_required. Source overlays show that some accepted fiducial quadrilaterals are visually wrong; JSON now adds geometryWarnings when the canonical version strip fails after warp.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added v3 phone-photo diagnostics for scoresheet import reliability work.

Changes:
- Added ScoreSheetImportService.buildV3PhonePhotoDiagnosticReport to expose dev-only diagnostic data without changing production import or UAT mutation behavior.
- Added diagnostic payloads with normalized/canonical images, fiducials, canonical anchors, grid/cell geometry, per-row selected cells, per-cell ink scores, rejection reasons, quality gates, and geometry warnings.
- Added scripts/ops/score-sheet-v3-diagnostics.js plus npm run diagnose:scoresheet-v3 to generate ignored PNG/JSON artifacts under temp/scoresheet-corpus-intake/diagnostics.
- Added unit coverage for the v3 diagnostic payload shape on a known synthetic v3 sheet.

Evidence:
- Generated diagnostics for IMG_5152.jpeg through IMG_5159.jpeg. Best variants remained manual_entry_required and accepted only 0-6 rows.
- The overlays show that same-sheet failures are not just bubble marks: some variants lose fiducials, while best variants often accept fiducials but fail the canonical version strip after warp, indicating suspect geometry before mark tuning.

Verification:
- npx tsc --noEmit
- npx jest tests/unit/services/ScoreSheetImportService.test.ts --runInBand
- npm run diagnose:scoresheet-v3
- node --check scripts/ops/score-sheet-v3-diagnostics.js
- git diff --check
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
