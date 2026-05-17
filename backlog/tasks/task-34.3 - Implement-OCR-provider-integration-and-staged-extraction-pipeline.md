---
id: TASK-34.3
title: Implement OCR provider integration and staged extraction pipeline
status: Done
assignee:
  - '@codex'
created_date: '2026-05-17 06:12'
updated_date: '2026-05-17 17:49'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the backend integration needed to submit uploaded scoresheets to the chosen OCR provider, capture structured extraction output, and persist draft extraction data without treating it as accepted scoring.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Authorized users can submit an uploaded scoresheet file to the OCR pipeline through the existing score-file flow or a directly related OCR ingestion path.
- [x] #2 OCR output is captured as structured draft extraction data with confidence or ambiguity metadata where available.
- [x] #3 OCR ingestion does not create accepted scoring directly and remains auditable against the uploaded source artifact.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the original OCR-provider-first assumption with a template-first extraction architecture that treats uploaded scoresheets as fixed-layout score grids attached to the existing score-file workflow.
2. Define the new backend draft model and processing pipeline for Phase 1: score-file source artifact, template identification or selection, page alignment, per-cell mark detection, derived total calculation, and review-required draft persistence.
3. Implement the extraction service and API surface needed to submit a score file for processing and retrieve the staged extraction result without creating accepted scores directly.
4. Keep the pipeline self-hosted for Phase 1, with generic OCR only as an optional helper for printed headers if needed, and explicitly defer handwritten comments to TASK-95.
5. Verify the extraction pipeline against the provided sample packet and ensure every produced draft remains auditable, tied to the uploaded source file, and ready for the review UI work in TASK-34.4.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Phase 1 implementation should use the existing contestant-scoped score-file upload surface as the scoresheet import entry point instead of creating a separate detached upload flow.
- The current commentary-attachment semantics need to be broadened so the pipeline can distinguish ordinary attachments from scoresheet import source artifacts through explicit metadata or intent.

- Added explicit `SCORESHEET_IMPORT` intent handling to the existing score-file upload flow so contestant-scoped uploads can serve as Phase 1 scoresheet import source artifacts without creating a separate upload surface.
- Added a new `ScoreSheetImportDraft` persistence model and migration to store staged extraction output, confidence, computed totals, and processing status tied to the uploaded score file.
- Implemented a self-hosted `ScoreSheetImportService` that renders image or PDF uploads, normalizes the page, performs template-first grid-cell scoring analysis, and upserts a draft extraction record without creating accepted scores.
- Added backend endpoints to process a score file into a staged scoresheet-import draft and retrieve the draft for later review UI work.
- Added frontend client methods for the new process and draft-read endpoints.
- Added a synthetic unit test that verifies the detector can recover purple-marked score cells from a normalized image.
- Probed the provided sample PDF against the current detector; the pipeline runs and produces confidence-scored draft output, but real-sample calibration is still weak and should be tuned in TASK-34.5 rather than treated as production-ready accuracy today.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the Phase 1 backend scoresheet-import pipeline for TASK-34.

What changed:
- Reused the existing contestant-scoped score-file upload entry point by adding explicit `SCORESHEET_IMPORT` intent handling.
- Added `ScoreSheetImportDraft` persistence so uploaded scoresheets can produce auditable, review-required extraction drafts tied to the original source file.
- Added a self-hosted template-first extraction service that renders the uploaded page, normalizes it, evaluates fixed score-grid cells, computes a draft total, and records ambiguity or confidence per criterion without creating accepted scores.
- Added API endpoints to process a score file into a scoresheet-import draft and retrieve that draft for the future review workflow.
- Added frontend API client methods and a targeted unit test for the detector path.

Verification:
- npx prisma generate
- npm run build
- cd frontend && npm run type-check
- npx jest tests/unit/services/ScoreSheetImportService.test.ts --runInBand

Known limitation carried forward intentionally:
- The current detector path is structurally working but still poorly calibrated on the real sample PDF. It emits confidence-scored draft output, which is enough for the backend pipeline task, but extraction accuracy tuning remains follow-up work for TASK-34.5 and the review UI in TASK-34.4.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
