---
id: TASK-34.14
title: Add capture-quality gating and review-burden metrics for scoresheet import
status: Done
assignee:
  - '@codex'
created_date: '2026-05-18 16:39'
updated_date: '2026-05-25 16:26'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the scoresheet-import path reject weak inputs earlier and measure whether the review flow is actually saving operator effort compared with delegated entry.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The import path defines and enforces capture-quality gates for supported Education uploads, including conditions that should fail fast into delegated entry instead of producing misleading drafts.
- [x] #2 The review workflow records or reports operational burden metrics such as incorrect rows, ambiguous rows, and manual corrections per sheet so rollout decisions can be based on operator effort.
- [x] #3 The supported and unsupported upload conditions are documented clearly enough for operators to know when to use scoresheet import and when to fall back immediately.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-read the scoresheet import service, draft API surface, regression harness, UAT script, and operator docs to confirm where quality and burden data should be exposed.
2. Add a backend quality-gate result to the extraction payload and persisted draft metadata using existing extraction signals such as grid anchoring, ambiguous rows, confidence, warnings, and image quality. Use same-user manual-entry fallback language rather than default delegate fallback.
3. Add review-burden metrics to extraction output and harness reporting, including ambiguous rows, low-confidence rows, estimated manual review rows, incorrect rows when ground truth is available, and false high-confidence marks.
4. Enforce fail-fast behavior for weak supported Education uploads so misleading drafts are rejected or clearly marked for manual entry instead of being presented as usable reviewed drafts.
5. Update operator documentation to define supported scanner/PDF conditions, unsupported conditions, attempt-limit/fallback expectations, and current scanner-only limitations.
6. Add or update focused unit/regression coverage for quality-gate decisions and burden metric reporting, then run build plus targeted tests and calibration/UAT harness checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Confirmed ScoreSheetImportDraft status is a free-form string, so TASK-34.14 can add a rejected quality-gate status without a Prisma migration.
- Found the ScoringPage review surface currently applies any draft with extraction rows, so the implementation needs a frontend guard for rejected imports as well as backend status enforcement.

- Implemented backend quality-gate metadata and rejected draft status for weak scoresheet uploads. Rejected drafts keep diagnostic extraction payloads but are not usable review drafts.
- Added review-burden metrics to extraction payloads plus regression/UAT harness reporting, including estimated manual correction rows, gate rejection counts, and ground-truth manual correction rows where available.
- Updated ScoringPage so rejected drafts show manual-entry fallback guidance and cannot be applied to the score form.
- Updated operator reliability/UAT docs with scanner-only support boundaries, two-attempt retry guidance, and same-user manual-entry fallback.
- Verification: npm run build; npx jest tests/unit/services/ScoreSheetImportService.test.ts --runInBand; frontend npm run build; npx eslint src/pages/ScoringPage.tsx --quiet --max-warnings 0; node --check scripts/ops/score-sheet-import-regression.js; node --check scripts/ops/score-sheet-import-uat.js; calibration and UAT harnesses. Full frontend lint remains blocked by unrelated existing issues in JudgeSchedulesPage.tsx and frontend/temp/task70_scroll_probe.mjs.
- Calibration outcome remains No-Go: default packet failed at 48.3% exact row match with 4/6 pages rejected by the gate; expanded scanner corpus failed at 48.3% exact row match with 23/30 pages rejected by the standard-mode gate. Accepted clean-scan pages can still contain false high-confidence wrong marks, so review removal is not justified.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented capture-quality gating and review-burden reporting for scoresheet import.

Changes:
- Added qualityGate and reviewBurdenMetrics to ScoreSheetImportService extraction payloads. Weak supported uploads now persist as rejected drafts with diagnostic metadata instead of processed review drafts.
- Added same-user manual-entry fallback language and a two-attempt retry limit to runtime rejection messages and operator docs.
- Updated ScoringPage to surface rejected imports, show gate/burden reasons, and prevent rejected drafts from being applied to the scoring form.
- Extended regression and UAT harnesses to report gate rejection counts, estimated correction rows, manual correction rows from ground truth, and false high-confidence marks.
- Added unit coverage for accepted anchored grids, weak-upload rejection, and rejected draft persistence.

Validation:
- npm run build
- npx jest tests/unit/services/ScoreSheetImportService.test.ts --runInBand
- cd frontend && npm run build
- cd frontend && npx eslint src/pages/ScoringPage.tsx --quiet --max-warnings 0
- node --check scripts/ops/score-sheet-import-regression.js
- node --check scripts/ops/score-sheet-import-uat.js
- node scripts/ops/score-sheet-import-regression.js --mode=calibration
- node scripts/ops/score-sheet-import-regression.js --mode=calibration --ground-truth=tests/examples/scoresheet-import/route66-2026-pet-education-scanner-ground-truth.json
- node scripts/ops/score-sheet-import-uat.js

Outcome:
The gate catches weak scanner/phone-style inputs, but the extractor remains below release reliability. Default calibration still fails at 48.3% exact row match with 4/6 clean pages rejected; expanded scanner calibration still fails at 48.3% exact row match with 23/30 standard-mode pages rejected. Some accepted clean-scan pages still contain false high-confidence wrong marks, so the review/correction step must remain and OCR import should stay internal/calibration-only.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
