---
id: TASK-34.29
title: Implement v3 anchor-and-bubble OMR extraction
status: Done
assignee:
  - '@codex'
created_date: '2026-05-25 16:39'
updated_date: '2026-05-25 19:46'
labels:
  - scoring
  - ocr
  - backend
dependencies:
  - TASK-34.31
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a deterministic extraction path for approved machine-readable v3 scoresheets using registration anchors and known score mark regions instead of handwritten ink-density inference. Keep v1/current extraction unchanged and route by detected template version. The v3 extractor must read only the primary score grid and explicitly ignore the commentary region.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The import service detects v3 sheets by template/version metadata and routes them to a separate v3 extractor without breaking v1/current import behavior.
- [x] #2 The v3 extractor uses registration anchors to normalize the page and known score mark regions to select criterion scores.
- [x] #3 The extraction payload records v3 template version, anchor quality, mark quality, rejected rows, ignored commentary region handling, and confidence inputs needed for assurance decisions.
- [x] #4 The v3 path rejects unclear or multi-mark rows instead of producing false high-confidence scores.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the import template model with the approved education_omr_v3 template/version and normalized grid geometry for the v3 portrait sheet, keeping education_saturday_day_v1 unchanged.
2. Add v3 routing in ScoreSheetImportService: prefer explicit upload/process metadata when present, then detect the v3 page by machine-readable top metadata/version-strip signals before falling back to current v1 criteria-based inference.
3. Add a v3 extractor path that samples only the anchored primary score grid, records sheetVersion/templateVersion, anchor quality, mark quality, rejected rows, and ignored commentary-region metadata, and leaves the existing v1 extraction path intact.
4. Tighten v3 row decisions so missing, unclear, and multi-mark rows are rejected/ambiguous instead of producing high-confidence scores.
5. Add focused unit tests for v3 metadata routing, score extraction, commentary scribble ignored below the grid, multi-mark rejection, and v1/current behavior preservation.
6. Run targeted ScoreSheetImportService tests, renderer tests as needed, npm run build, and git diff --check.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Retargeted TASK-34.29 to the user-approved v3 sheet after TASK-34.31 visual approval.
- Initial code read shows current import flow already normalizes pages, resolves templates, anchors table grid lines, scores rows, and applies quality gates. The v3 work should extend that path with a separate template/routing mode rather than replacing v1.

- Implemented education_omr_v3 import template metadata with machine-readable sheetVersion/templateVersion and commentary ignored region.
- Added ScoreSheetImportService v3 routing from explicit metadata or detected anchors/version strip, while preserving criteria-only inference for education_saturday_day_v1.
- Added v3 extraction metadata: anchorQuality, markQuality, rejectedRows, and ignoredRegions.
- Added v3 multi-mark/missing/low-confidence row rejection so ambiguous rows do not produce scores.
- Added unit coverage for v3 metadata detection, commentary ignored below the grid, multi-mark rejection, and existing v1 extraction behavior.
- Verification passed: npx jest tests/unit/services/ScoreSheetImportService.test.ts --runInBand.
- Verification passed: npx jest tests/unit/utils/scoreSheetV2Renderer.test.ts tests/unit/utils/scoreSheetV3Renderer.test.ts tests/unit/services/PrintService.test.ts --runInBand.
- Verification passed: node --check scripts/ops/generate-score-sheet-v3-fixtures.js.
- Verification passed: npm run build.
- Verification passed: git diff --check.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented deterministic v3 anchor-and-bubble extraction for the approved machine-readable scoresheet.

Changes:
- Added education_omr_v3 to the import template model with v3 machine-readable metadata, normalized score-grid geometry, and the ignored commentary region.
- Updated ScoreSheetImportService to route v3 uploads by explicit template metadata or detected corner anchors/version-strip metadata before falling back to the existing v1 criteria-based flow.
- Added v3 extraction metadata in the draft payload: sheetVersion/templateVersion, anchorQuality, markQuality, rejectedRows, and ignoredRegions.
- Added stricter v3 row handling so missing, low-confidence, and multi-mark rows are rejected/ambiguous instead of producing false high-confidence scores.
- Preserved education_saturday_day_v1 criteria inference and existing current/v1 import behavior.

Tests:
- npx jest tests/unit/services/ScoreSheetImportService.test.ts --runInBand
- npx jest tests/unit/utils/scoreSheetV2Renderer.test.ts tests/unit/utils/scoreSheetV3Renderer.test.ts tests/unit/services/PrintService.test.ts --runInBand
- node --check scripts/ops/generate-score-sheet-v3-fixtures.js
- npm run build
- git diff --check

Follow-up:
- TASK-34.30 should validate v3 assurance/rollout policy against generated v3 samples and any available marked scanner scans before removing review requirements.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
