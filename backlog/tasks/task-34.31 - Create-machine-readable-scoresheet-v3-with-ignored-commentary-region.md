---
id: TASK-34.31
title: Create machine-readable scoresheet v3 with ignored commentary region
status: Done
assignee:
  - '@codex'
created_date: '2026-05-25 17:39'
updated_date: '2026-05-25 18:57'
labels:
  - scoring
  - ocr
  - forms
  - backend
dependencies: []
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a v3 machine-readable scoresheet layout that keeps the v2 anchor/bubble requirements, adds a judge commentary area below scoring as an explicitly ignored region, and produces a portrait-letter preview for review before extraction work continues.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The v3 generated sheet preserves stable anchors, template/version identity, score metadata, and the Education score grid.
- [x] #2 The v3 generated sheet includes a clearly labeled judge commentary block below scoring that is marked as ignored for import scoring.
- [x] #3 The preview artifact renders as a portrait letter page rather than a wide browser canvas.
- [x] #4 A deterministic v3 fixture and preview PNG are generated for review and later regression use.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a v3 renderer based on the v2 machine-readable layout, with SCORESHEET-V3/education_omr_v3 identity and an explicit data-ignore-region commentary block below scoring.
2. Add deterministic v3 fixture generation and a package script while leaving v2 fixtures/routes intact.
3. Add focused tests for anchors, grid geometry, ignored commentary region, and portrait letter sizing.
4. Generate the HTML fixture and a portrait PNG preview in temp/ for review.
5. Run targeted tests, build, and diff hygiene checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added v3 renderer with SCORESHEET-V3 / education_omr_v3 markers, portrait Letter sheet sizing, primary score grid, and data-ignore-region commentary block below scoring.
- Wired v3 into PrintService/controller/routes alongside v2 instead of replacing v2.
- Added v3 fixture generator and renderer/service unit coverage.

- Verification passed: node --check scripts/ops/generate-score-sheet-v3-fixtures.js.
- Verification passed: npx jest tests/unit/utils/scoreSheetV2Renderer.test.ts tests/unit/utils/scoreSheetV3Renderer.test.ts tests/unit/services/PrintService.test.ts --runInBand (55 tests).
- Verification passed: npm run build.
- Verification passed: git diff --check.
- Generated v3 fixture: tests/examples/scoresheet-import/v3/education-omr-v3-sample.html.
- Generated portrait preview PNG: temp/score-sheet-v3-preview.png (816 x 1056).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Created and approved a v3 machine-readable scoresheet layout before extraction work continues.

Changes:
- Added SCORESHEET-V3 / education_omr_v3 renderer with portrait Letter dimensions, four anchors, version strip, page identity metadata, and the Education 10 x 7 scoring grid.
- Added a Judge Commentary block below scoring marked with data-ignore-region="commentary" so extraction can ignore that area while preserving parity with current paper sheets.
- Added PrintService/controller/route support for POST /api/print/scoresheets/v3 alongside the existing v2 route.
- Added deterministic v3 fixture generation and a preview PNG at temp/score-sheet-v3-preview.png for user review.

Tests:
- node --check scripts/ops/generate-score-sheet-v3-fixtures.js
- npx jest tests/unit/utils/scoreSheetV2Renderer.test.ts tests/unit/utils/scoreSheetV3Renderer.test.ts tests/unit/services/PrintService.test.ts --runInBand
- npm run build
- git diff --check

Result:
- User approved the v3 preview; extraction work should target v3 as the candidate machine-readable sheet.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
