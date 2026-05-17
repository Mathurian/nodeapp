---
id: TASK-34.7
title: >-
  Build annotated template-family sample corpus and ground-truth dataset for
  scoresheet import
status: Done
assignee:
  - '@codex'
created_date: '2026-05-17 19:42'
updated_date: '2026-05-17 19:56'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the representative annotated sample set needed to calibrate and validate reliable scoresheet import for Phase 1. This task should gather clean scans and phone-photo captures across the supported scoresheet template families, record ground-truth criterion scores, and package that data so extraction accuracy can be measured repeatably.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A representative sample packet exists for each intended Phase 1 scoresheet template family, including both clean scans and phone-photo captures where available.
- [x] #2 Ground-truth criterion score values are documented for the sample packet in a machine-readable form that can be used by calibration and regression checks.
- [x] #3 Known capture constraints and unsupported image conditions are documented so reliability targets are based on the actual intended input conditions.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the real scoresheet template families already available locally and identify which one should become the first supported Phase 1 family.
2. Build a machine-readable ground-truth dataset from the existing sample packet, starting with the Education sheets, including criterion-level expected scores and page metadata.
3. Define the additional sample packet still required for reliability, especially phone-photo captures and repeated judge-marking variations for the same template family.
4. Document the supported input assumptions and capture constraints that the extractor will be calibrated against so later accuracy measurements are meaningful.
5. Package the corpus and documentation so TASK-34.8 and TASK-34.9 can use it directly for calibration and regression testing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Inventoried the shared Route 66 sample packet into five six-page template-family blocks: Education, Formal Wear & Speech, Hot Wear & Pop-Question, Personal Interview, and Public Image.
- Selected Education as the first supported Phase 1 family and recorded criterion-level ground truth for all six Education pages in tests/examples/scoresheet-import/route66-phase1-ground-truth.json.
- Added docs/operations/OCR-SCORESHEET-SAMPLE-CORPUS-PHASE1.md to define the first supported family, the packet inventory, the current supported calibration assumptions, and the missing sample requirements.
- No dedicated phone-photo sample set exists yet; that is explicitly recorded as remaining sample work rather than hidden scope.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Built the first reusable scoresheet-import sample corpus for Phase 1 and documented the real support boundary for calibration work.

What changed:
- Added tests/examples/scoresheet-import/route66-phase1-ground-truth.json with machine-readable ground truth for the six-page Education template family and page-block inventory for the full 30-page Route 66 packet.
- Added docs/operations/OCR-SCORESHEET-SAMPLE-CORPUS-PHASE1.md to define the first supported family, packet structure, supported calibration assumptions, unsupported conditions, and additional sample requirements.
- Narrowed the follow-on reliability work to Education first, while explicitly inventorying the other observed families for later support.

Notes:
- Phone-photo captures are still missing; the task records them as required follow-up input for calibration and rollout, not as silently satisfied scope.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
