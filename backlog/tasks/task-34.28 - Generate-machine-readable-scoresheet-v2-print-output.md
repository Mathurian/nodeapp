---
id: TASK-34.28
title: Generate machine-readable scoresheet v2 print output
status: Done
assignee:
  - '@codex'
created_date: '2026-05-25 16:39'
updated_date: '2026-05-25 17:21'
labels:
  - scoring
  - ocr
  - forms
  - backend
dependencies:
  - TASK-34.27
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the printable v2 scoresheet output from the approved v2 contract with minimal disruption to current report/print flows. The generated sheet should remain human-readable while adding machine-readable anchors, identity metadata, and score mark regions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The print/report path can generate a v2 machine-readable scoresheet for supported categories without removing the existing v1/current scoresheet output.
- [x] #2 The generated sheet includes stable registration anchors, template/version identity, page identity metadata, and score mark regions aligned to the v2 contract.
- [x] #3 The output remains usable by judges with clear human-readable labels and minimal layout disruption.
- [x] #4 Generated sample fixtures are saved for calibration and regression testing.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add backend types and a focused PrintService method for generating v2 machine-readable scoresheet HTML/PDF for a supported category/judge/contestant context. Keep the existing v1/current report paths unchanged.
2. Render a letter-portrait v2 sheet matching the contract: four anchors, SCORESHEET-V2 + education_omr_v2 identity, human-readable event/contest/category/judge/contestant fields, score value headers, and filled-target bubble/box regions for each criterion.
3. Add a narrow authenticated print route/controller action for v2 scoresheet generation that validates tenant access to category, contestant, and judge context before returning PDF or HTML.
4. Add a fixture-generation script that creates deterministic v2 sample output for calibration/regression storage without requiring production data. Save generated sample fixtures under tests/examples/scoresheet-import/v2/ or an equivalent tracked fixture path.
5. Add focused tests for the v2 generator contract: anchors/version identity are present, row/order/score values match the supported Education template, and v1/current generation paths remain untouched.
6. Run build, targeted unit tests, syntax checks, and lightweight PDF/HTML generation verification. Document any remaining UI integration as follow-up scope rather than expanding this task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Started TASK-34.28 after TASK-34.27 approval. Current search found no dedicated printable scoresheet generator despite the quick action pointing to /reports?type=scoresheets. Existing surfaces are generic ReportGeneration/ReportExport and PrintService routes.
- To keep changes minimal, the implementation should add a backend-first v2 scoresheet generator/API and fixture command, then leave broader ReportsPage UX integration for a later task unless a small link is clearly available.

- Added the backend v2 scoresheet renderer/service path, print route, fixture generator, and focused renderer/PrintService tests.
- Beginning verification with build, targeted Jest, syntax, fixture generation, and diff checks.

- Verification passed: node --check scripts/ops/generate-score-sheet-v2-fixtures.js.
- Verification passed: npx jest tests/unit/utils/scoreSheetV2Renderer.test.ts tests/unit/services/PrintService.test.ts --runInBand (50 tests).
- Verification passed: npm run build.
- Verification passed: git diff --check.
- Generated fixture: tests/examples/scoresheet-import/v2/education-omr-v2-sample.html.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented backend generation for the machine-readable scoresheet v2 print output.

Changes:
- Added a reusable v2 renderer for letter portrait Education OMR sheets with four registration anchors, SCORESHEET-V2/education_omr_v2 identity markers, version bits, page identity metadata, judge/contestant labels, and 10 x 7 mark regions.
- Added PrintService support plus /api/print/scoresheets/v2 for tenant-scoped category, contestant, and judge contexts while leaving existing generic print/report flows unchanged.
- Added deterministic fixture generation under tests/examples/scoresheet-import/v2/education-omr-v2-sample.html and an npm script to regenerate it.
- Added unit coverage for renderer contract markers, Education row/score stability, escaping, tenant-scoped lookup, HTML/PDF generation, unsupported criteria, and unassigned contestant/judge rejection.

Tests:
- node --check scripts/ops/generate-score-sheet-v2-fixtures.js
- npx jest tests/unit/utils/scoreSheetV2Renderer.test.ts tests/unit/services/PrintService.test.ts --runInBand
- npm run build
- git diff --check

Follow-up:
- TASK-34.29 should implement the v2 anchor-and-bubble extraction path against this fixture and generated output.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
