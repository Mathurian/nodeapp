---
id: TASK-34.9
title: >-
  Add automated extraction regression harness and reliability thresholds for
  scoresheet import
status: Done
assignee:
  - '@codex'
created_date: '2026-05-17 19:43'
updated_date: '2026-05-17 21:16'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a repeatable validation harness for Phase 1 scoresheet import so template calibration can be measured and protected against regression. This task should compare extracted criterion values against the annotated ground-truth dataset, compute row-level accuracy metrics, and enforce explicit reliability thresholds for supported templates.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A repeatable validation harness exists that runs the scoresheet extractor against the annotated sample corpus and reports row-level accuracy for each supported template family.
- [x] #2 Target reliability thresholds are defined for supported templates, including exact-match score extraction expectations and failure conditions that block rollout.
- [x] #3 The calibration and release process can detect extraction regressions before shipping changes to supported scoresheet templates.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extract the current Education-family sample evaluation out of the unit test into a dedicated regression harness that reads the shared ground-truth corpus and reports per-page, per-row, and per-template accuracy metrics in a structured format.
2. Define the Phase 1 reliability thresholds explicitly for the currently supported Education family, separating calibration-stage expectations from rollout-blocking thresholds so the release contract is unambiguous.
3. Add failure conditions for unsupported or degraded behavior, including exact-row-match rate, per-page total drift, and regression against previously recorded results.
4. Wire the harness into the development and release workflow so supported-template changes can be checked intentionally before shipping.
5. Document the reliability policy and current boundary in operations docs, including that Education is the only calibrated family and that phone-photo rollout still depends on future UAT data from TASK-34.10.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added a dedicated regression harness at scripts/ops/score-sheet-import-regression.js that evaluates supported scoresheet templates against the shared ground-truth corpus and reports per-page plus per-template accuracy metrics.
- Added machine-readable threshold policy at tests/examples/scoresheet-import/route66-phase1-thresholds.json with separate calibration and rollout modes for the currently supported Education template.
- Wired the harness into package scripts as test:scoresheet-import:calibration and test:scoresheet-import:rollout so supported-template changes can be checked intentionally before shipping.
- Added OCR-SCORESHEET-RELIABILITY-POLICY.md to document the current thresholds, failure policy, and the difference between calibration pass and rollout readiness.
- Verified the current state explicitly: calibration mode passes for Education, while rollout mode fails because exact-row-match and total-delta thresholds are still not strong enough for release.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the automated scoresheet-import regression harness and explicit reliability policy for the first calibrated Phase 1 template family.

What changed:
- Added scripts/ops/score-sheet-import-regression.js to run structured regression evaluation against the shared scoresheet ground-truth corpus.
- Added tests/examples/scoresheet-import/route66-phase1-thresholds.json with separate calibration and rollout thresholds for education_saturday_day_v1.
- Added npm scripts in package.json for calibration and rollout regression checks.
- Added docs/operations/OCR-SCORESHEET-RELIABILITY-POLICY.md and cross-linked it from the Phase 1 sample corpus doc.
- Simplified the unit test so corpus-wide reliability gating now lives in the dedicated harness rather than a long-running Jest assertion.

Verified behavior:
- npx jest tests/unit/services/ScoreSheetImportService.test.ts --runInBand
- npm run build
- node scripts/ops/score-sheet-import-regression.js --mode=calibration   -> PASS
- node scripts/ops/score-sheet-import-regression.js --mode=rollout       -> FAIL (expected current boundary)

Current boundary:
- Education is still the only calibrated live family.
- The harness now proves that current code is materially better than the generic baseline but not yet rollout-ready, which is the exact contract TASK-34.10 should take into UAT.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
