---
id: TASK-34.2
title: Collect scoresheet samples and define OCR extraction schema
status: Done
assignee:
  - '@codex'
created_date: '2026-05-17 06:12'
updated_date: '2026-05-17 07:48'
labels: []
dependencies: []
documentation:
  - docs/operations/OCR-SCORESHEET-PHASE1-CONTRACT.md
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prepare TASK-34 implementation by gathering representative paper scoresheet samples, confirming the canonical template or templates, and defining the extraction schema that OCR output must map into before staged review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A representative sample set is collected or otherwise defined for OCR validation, including handwritten and photo-captured scoresheets plus any known layout variants.
- [x] #2 The canonical extraction schema is documented, including represented judge, contestant, criterion values, deductions, comments, and any paper-only markers that need special handling.
- [x] #3 Any intake constraints or format gaps that affect OCR readiness, such as TIFF or HEIF support or file-size assumptions, are identified for implementation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refresh the current scoring, deductions, commentary, score-file, and delegated-entry schema from code so the OCR extraction contract maps to the real scoring model already in production.
2. Confirm whether any canonical paper scoresheet assets already exist in the repo; if not, define the representative sample packet required from operations, including clean scans, handwritten sheets, phone photos, and any known layout variants.
3. Document the extraction schema for OCR, including represented judge, contestant, criterion values, deductions, comments, and any paper-only markers that need review handling.
4. Identify current intake constraints and likely implementation gaps, including file-type support, file-size assumptions, and which follow-on OCR subtasks should own each required change.
5. Record the resulting schema and sample requirements so TASK-34.3 through TASK-34.5 can execute against a fixed contract instead of assumptions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reviewed the live scoring persistence and write path in Prisma, ScoringService, scoringController, and score-file upload routes so the Phase 1 import contract maps to production data structures.
- Confirmed the active score model is one persisted score row per tenant/category/contestant/judge/criterion, with represented judge resolution, entry mode, and delegation handled by the existing scoring workflow.
- Inspected the sample scoresheet packet in temp/DD_Scores copy.pdf and confirmed the practical Phase 1 problem is fixed-layout score-grid interpretation, not full handwritten-document OCR.
- Locked Phase 1 scope to scores-only import, with handwritten comments deferred to TASK-95.
- Documented the required sample packet, extraction schema, review contract, and known intake gaps such as TIFF/HEIF support in docs/operations/OCR-SCORESHEET-PHASE1-CONTRACT.md.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the Phase 1 OCR preparation contract for TASK-34.

Outcome:
- Defined the scores-only extraction contract for Phase 1.
- Confirmed the import should target the existing score-file and score-submission workflow rather than a parallel scoring model.
- Used the provided sample PDF to determine that the near-term problem is template-driven grid extraction, with handwritten comments deferred.

Key decisions:
- Phase 1 will import only criterion scores, not handwritten comments.
- Upload context should provide or confirm category, represented judge, and contestant instead of forcing extraction of all identity data from the page.
- The authoritative total should be recomputed from accepted criterion values, not trusted from handwritten totals on paper.
- The implementation should stay review-required before any score rows are created.

Artifacts:
- docs/operations/OCR-SCORESHEET-PHASE1-CONTRACT.md
- temp/DD_Scores copy.pdf evaluated as the first real sample packet input
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
