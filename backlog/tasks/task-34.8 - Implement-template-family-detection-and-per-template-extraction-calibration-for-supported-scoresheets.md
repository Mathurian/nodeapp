---
id: TASK-34.8
title: >-
  Implement template-family detection and per-template extraction calibration
  for supported scoresheets
status: Done
assignee:
  - '@codex'
created_date: '2026-05-17 19:42'
updated_date: '2026-05-17 20:53'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current generic detector assumptions with explicit template-family support for the scoresheet formats intended for Phase 1. This task should add reliable template identification or selection, per-template anchor logic, row and column calibration, and extraction behavior tuned against the annotated sample corpus.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The import pipeline can identify or explicitly select the supported scoresheet template family before extraction begins.
- [x] #2 Per-template alignment and score-cell mapping are implemented for the intended Phase 1 scoresheet families, rather than relying on one generic row map.
- [x] #3 Extraction behavior is recalibrated against the annotated sample corpus and materially reduces the false-positive and total-mismatch failures seen in TASK-34.5.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refactor the scoresheet-import service so extraction is template-family aware instead of relying on one global grid definition, while keeping the Phase 1 scope limited to the Education family first.
2. Add explicit template selection or identification inputs and wire the resulting template key through score-file processing, draft persistence, and the review payload.
3. Implement Education-specific alignment and score-cell mapping calibrated against the six-page ground-truth dataset, replacing the current generic row assumptions and tuning for the observed checkmark and cross mark styles.
4. Add focused regression coverage that runs the calibrated Education extractor against the local ground-truth samples and proves materially better row-level behavior than the TASK-34.5 baseline.
5. Keep the other observed template families inventoried but unsupported for now, and document that the new behavior intentionally narrows support to explicit Education calibration rather than pretending broader reliability.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added explicit scoresheet template definitions and narrowed current calibrated support to the Education family instead of running one generic detector against every category.
- The import service now resolves or accepts a template key, reorders category criteria into printed sheet order, detects grid geometry from printed form lines, and persists the resolved template key into draft output.
- Unsupported or changed score sheets now fail with an explicit not-yet-calibrated error instead of silently producing misleading draft scores.
- Added regression coverage that exercises the Education-family extractor against the local sample packet and verifies materially better behavior than the TASK-34.5 baseline.
- Reliability is improved but not yet release-gated; TASK-34.9 remains responsible for the final automated thresholds and regression policy.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented template-aware scoresheet extraction for the first supported Phase 1 family and removed the most misleading generic-detector behavior from the import pipeline.

What changed:
- Added src/config/scoreSheetImportTemplates.ts with explicit template-family metadata and selected Education as the first calibrated template.
- Updated ScoreSheetImportService to resolve template support from category criteria or an explicit template key, reorder criteria into printed sheet order, detect score-grid geometry from printed line sequences, and extract scores using template-specific calibration instead of a single hardcoded generic map.
- Updated score-file metadata handling and the processing controller path so scoresheet imports can carry or persist a template key through processing and review.
- Added focused regression coverage in tests/unit/services/ScoreSheetImportService.test.ts using the local Education sample packet plus row-ordering coverage for the template matcher.

Current support boundary:
- Education is the only calibrated family in the live code path right now.
- Other inventoried template families remain unsupported and should fail cleanly into manual review or delegated entry until calibrated later.
- TASK-34.9 still owns the stronger release-threshold and regression-gate work before Phase 1 can be considered reliable enough for rollout.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
