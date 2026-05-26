---
id: TASK-34.41
title: Calibrate v3 bubble mark scoring with real phone-photo corpus
status: Done
assignee:
  - '@codex'
created_date: '2026-05-26 04:13'
updated_date: '2026-05-26 20:46'
labels:
  - scoring
  - ocr
  - uat
  - calibration
dependencies:
  - TASK-34.40
  - TASK-34.29
  - TASK-34.36
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tune v3 bubble scoring only after page normalization is inspectable and stable. The goal is to explain and fix why visible marks on the same physical sheet can fall below the current mark threshold without introducing false high-confidence marks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 IMG_5152.jpeg through IMG_5159.jpeg are evaluated against known ground truth for the same sheet and reported with exact-row rate, ambiguous rows, total delta, rejected reasons, and false high-confidence marks.
- [x] #2 Mark scoring changes are based on corpus evidence, not a blind global threshold reduction, and include safeguards for multi-mark, shadow, gridline, and neighboring-cell false positives.
- [x] #3 The calibration report compares the current threshold behavior against the selected tuned behavior for standard and scan B/W preprocessing modes.
- [x] #4 Existing scanner/synthetic v3 samples and the original setup photo do not regress in exact-row match rate or false high-confidence mark count.
- [x] #5 TASK-34.36 rollout recommendation is updated to say whether v3 phone uploads are ready for reviewed import integration, still parse-only, or require template/capture changes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the current v3 phone-photo baseline for IMG_5152 through IMG_5159 against the known ground truth so the task starts with a measured current-vs-target comparison.
2. Inspect the current v3 mark-scoring path, rejected-row logic, and diagnostic artifacts to identify why geometry-accepted captures still miss visible marks, with attention to shadow, gridline bleed, neighboring cells, and multi-mark behavior.
3. Implement the smallest evidence-based tuning to v3 bubble scoring and confidence gating, then compare the tuned behavior against the current behavior for both standard and scan B/W preprocessing modes.
4. Verify that synthetic v3 sheets, scanner/calibration samples, and the original setup phone photo do not regress in exact-row match or false high-confidence marks, and keep the certification gate conservative.
5. Update TASK-34.36 rollout guidance with the calibration outcome: ready for reviewed import integration, still parse-only, or blocked on template/capture changes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Implemented a conservative multi-candidate v3 scoring path in ScoreSheetImportService. Standard remains the baseline candidate; full-page scan-normalized and canonical scan-normalized candidates are only allowed to replace it when they preserve already accepted baseline rows and add newly accepted rows that another candidate also agrees on.
- This avoids a blind threshold drop and directly targets the observed shadow/outline failure mode behind multi_mark explosions on real phone photos.
- Corpus result on IMG_5152 through IMG_5159: standard mode now rescues IMG_5155 from 1/10 accepted rows to 10/10 exact rows with total delta 0 and zero false high-confidence marks. Standard aggregate across the eight photos is now 11 accepted rows / 80, 10 exact rows / 80, 69 ambiguous rows, and 0 false high-confidence marks.
- Best per-image manual variants remain mixed: scan_bw_fixed_150 helps IMG_5152, scan_bw_fixed_170 helps IMG_5154 and IMG_5157, scan_bw_otsu fully solves IMG_5156, and IMG_5153/5158/5159 remain hard rejects.
- Non-regression checks: npx tsc --noEmit passed; npm run build passed; direct synthetic v3 extraction still returns [6,5,4,3,2,1,0,6,5,4] with 0 rejected rows and 0 false high-confidence rows; IMG_5145 still has 0 false high-confidence marks and scan_bw_fixed_190 remains 10/10 exact.
- Outcome: this is a real reliability improvement, but not enough for reviewed import rollout. Recommendation stays parse-only until capture or template changes improve the broader phone-photo corpus.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented a conservative v3 phone-photo scoring fallback inside ScoreSheetImportService.

Changes:
- Added multi-candidate v3 extraction analysis so the standard pass remains primary while full-page scan-normalized and canonical scan-normalized candidates can be considered as fallbacks.
- Added guardrails so a fallback can win only when it preserves already accepted baseline rows and any newly accepted rows are confirmed by another candidate, preventing a blind threshold reduction from creating false positives.
- Updated the v3 diagnostic path to report against the actual selected scoring image and fallback context.
- Added focused unit coverage for fallback selection behavior.

Results:
- Standard mode now rescues IMG_5155 from 1/10 accepted rows to 10/10 exact rows with total delta 0 and zero false high-confidence marks.
- Across IMG_5152 through IMG_5159, standard mode still reaches only 10 exact rows out of 80 and 69 ambiguous rows, so the parser is improved but still not rollout-ready for reviewed import integration.
- Direct synthetic v3 extraction remains exact with zero rejected rows and zero false high-confidence marks. IMG_5145 still has zero false high-confidence marks and scan_bw_fixed_190 remains 10/10 exact.

Recommendation:
- Keep v3 phone uploads parse-only for now. Additional capture/template changes are still needed before reviewed-import rollout.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
