---
id: TASK-34.3
title: Implement OCR provider integration and staged extraction pipeline
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-17 06:12'
updated_date: '2026-05-17 08:00'
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
- [ ] #1 Authorized users can submit an uploaded scoresheet file to the OCR pipeline through the existing score-file flow or a directly related OCR ingestion path.
- [ ] #2 OCR output is captured as structured draft extraction data with confidence or ambiguity metadata where available.
- [ ] #3 OCR ingestion does not create accepted scoring directly and remains auditable against the uploaded source artifact.
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
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementation direction update:
- Use the existing score-file upload surface in the scoring workflow as the Phase 1 scoresheet-import entry point.
- Do not treat this as commentary-only upload behavior; the upload intent must explicitly distinguish scoresheet import from ordinary attachments.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
