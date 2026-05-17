---
id: TASK-34.1
title: Investigate OCR options for scoresheet uploads
status: Done
assignee:
  - '@codex'
created_date: '2026-05-16 19:53'
updated_date: '2026-05-17 06:11'
labels:
  - scoring
  - ocr
  - upload
  - research
milestone: m-0
dependencies: []
documentation:
  - docs/operations/OCR-SCORESHEET-INVESTIGATION.md
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Research the best OCR approach for uploaded or captured paper scoresheets so TASK-34 can be implemented with a clear technical recommendation. Compare candidate OCR providers or libraries against score extraction accuracy, handwriting and printed text handling, supported file types, privacy and security constraints, operational complexity, cost, and fit with the existing verified online scoring workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Evaluate viable OCR approaches for scoresheet uploads, including their ability to extract structured score and comment data from typical scoresheet images or files.
- [x] #2 Document tradeoffs for each option, including expected accuracy, handwriting support, supported formats, privacy or data-handling implications, operational complexity, and estimated cost.
- [x] #3 Recommend a preferred OCR approach for the application and outline the implementation risks, prerequisites, and next steps needed to support TASK-34.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current scoring, score-file, delegated-entry, and certification workflow so the OCR recommendation fits the verified scoring model already shipped in TASK-94.
2. Research viable OCR approaches for structured scoresheet extraction using current primary sources, prioritizing approaches that can handle mixed printed and handwritten marks or comments, image uploads, and privacy-sensitive deployment constraints.
3. Compare candidate options on extraction quality, handwriting support, structured field capture, supported formats, operational complexity, hosting and security model, cost, and fit with our staged-review scoring workflow.
4. Recommend a preferred approach, including whether OCR should be tenant-hosted, vendor-hosted, or hybrid, and identify prerequisites, risks, and the likely implementation shape for TASK-34.
5. Record the recommendation in the backlog task with enough detail to drive implementation or a deliberate fallback decision if OCR is still not reliable enough.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reviewed the shipped scoring, delegated-entry, score-file, and certification flow to ensure OCR fits the live authority model rather than bypassing it.
- Confirmed the existing insertion point is the `score-files` upload path with staged review before accepted score mutation.
- Confirmed the repo does not currently contain a canonical paper scoresheet template or sample asset, so representative real-world samples are a prerequisite for implementation.
- Compared Azure AI Document Intelligence, Amazon Textract, Google Document AI, and Tesseract using official documentation and pricing sources.
- Recommended Azure AI Document Intelligence as the preferred path because it best matches structured scoresheets with handwritten fields and has the strongest privacy and deployment story through container support.
- Documented implementation prerequisites, risks, and a staged-review implementation shape in docs/operations/OCR-SCORESHEET-INVESTIGATION.md.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the OCR investigation for scoresheet uploads.

Outcome:
- Recommended Azure AI Document Intelligence as the preferred OCR approach for TASK-34.
- Positioned OCR behind the existing `score-files` workflow and staged human review instead of direct score mutation.
- Documented tradeoffs for Azure, AWS Textract, Google Document AI, and Tesseract, including handwriting support, structured extraction fit, privacy posture, operational complexity, and cost model.

Key findings:
- The application already has a viable OCR ingestion point through score-file uploads and the verified scoring workflow delivered under TASK-94.
- No canonical paper scoresheet template exists in the repo, so a representative sample set is required before implementation.
- Current upload support is broad for common images and PDFs, but TIFF or HEIF scan workflows may require expansion.

Artifact:
- docs/operations/OCR-SCORESHEET-INVESTIGATION.md
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
