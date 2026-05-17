---
id: TASK-34.6
title: >-
  Compare OCR, OCR-plus-LLM, and vision-model extraction paths for scoresheet
  import
status: Done
assignee:
  - '@codex'
created_date: '2026-05-17 06:56'
updated_date: '2026-05-17 07:49'
labels: []
dependencies: []
documentation:
  - docs/operations/OCR-SCORESHEET-APPROACH-COMPARISON.md
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate whether classic OCR is the best foundation for scoresheet image import, or whether a hybrid or vision-model approach would better satisfy the end goal of accurate score and comments extraction from uploaded or photographed judge scoresheets. Include managed cloud, free-tier, and self-hosted options where viable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Classic OCR/document extraction, OCR plus LLM normalization, and direct vision-model extraction approaches are compared against the real scoresheet use case, including handwritten scores and comments.
- [x] #2 The comparison includes viable managed cloud, free-tier, and self-hosted options, with tradeoffs for accuracy, privacy, operational complexity, and cost.
- [x] #3 A recommendation is produced on whether OCR remains the best path forward for TASK-34 or whether a different technical approach should be preferred.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current scoring schema and review workflow again from the perspective of end-to-end import accuracy, including numeric scores, deductions, represented judge attribution, and comments handling.
2. Evaluate three approach families against the real scoresheet use case: classic OCR/document extraction, OCR plus LLM normalization, and direct vision-model extraction.
3. Include viable managed, free-tier, and self-hosted candidates where appropriate, and compare them on field accuracy, handwriting and comments handling, privacy posture, operational complexity, and auditability.
4. Use a real filled scoresheet sample to test whether the practical bottleneck is OCR quality, handwriting understanding, layout mapping, or comments extraction.
5. Produce a recommendation on whether OCR remains the best path for TASK-34 or whether a hybrid or alternate approach should be preferred.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reframed the evaluation around the actual sample scoresheet instead of generic OCR assumptions.
- Compared classic OCR/document extraction, OCR-plus-LLM normalization, direct vision-model extraction, and template-first mark detection against the real score-grid use case.
- Incorporated the under-1,000-pages-per-month usage profile into the recommendation and separated cost concerns from technical fit.
- Determined that OCR is not the best primary Phase 1 path for score-only imports; template-first self-hosted mark detection is the better fit.
- Left OCR, hybrid, and VLM approaches as future options for handwritten comments or fallback handling, with deferred comments work tracked in TASK-95.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the extraction-family comparison for scoresheet import.

Outcome:
- Determined that classic OCR is not the best primary approach for Phase 1 scores-only import.
- Recommended a template-first, review-required, self-hosted score-grid extraction path as the best near-term fit.
- Reserved OCR, OCR-plus-LLM, and direct VLM approaches for future comments handling, fallback logic, or broader document parsing needs.

Why:
- The provided sample packet shows that score extraction is mainly a fixed-layout mark-detection problem, while handwritten comments are the real OCR difficulty.
- At under 1,000 pages per month, managed OCR costs are tolerable, but technical fit still favors template-first extraction for scores-only import.

Artifact:
- docs/operations/OCR-SCORESHEET-APPROACH-COMPARISON.md
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
