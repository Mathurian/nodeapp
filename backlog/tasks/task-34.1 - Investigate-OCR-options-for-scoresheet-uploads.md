---
id: TASK-34.1
title: Investigate OCR options for scoresheet uploads
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-16 19:53'
updated_date: '2026-05-17 06:03'
labels:
  - scoring
  - ocr
  - upload
  - research
milestone: m-0
dependencies: []
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Research the best OCR approach for uploaded or captured paper scoresheets so TASK-34 can be implemented with a clear technical recommendation. Compare candidate OCR providers or libraries against score extraction accuracy, handwriting and printed text handling, supported file types, privacy and security constraints, operational complexity, cost, and fit with the existing verified online scoring workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Evaluate viable OCR approaches for scoresheet uploads, including their ability to extract structured score and comment data from typical scoresheet images or files.
- [ ] #2 Document tradeoffs for each option, including expected accuracy, handwriting support, supported formats, privacy or data-handling implications, operational complexity, and estimated cost.
- [ ] #3 Recommend a preferred OCR approach for the application and outline the implementation risks, prerequisites, and next steps needed to support TASK-34.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current scoring, score-file, delegated-entry, and certification workflow so the OCR recommendation fits the verified scoring model already shipped in TASK-94.
2. Research viable OCR approaches for structured scoresheet extraction using current primary sources, prioritizing approaches that can handle mixed printed and handwritten marks or comments, image uploads, and privacy-sensitive deployment constraints.
3. Compare candidate options on extraction quality, handwriting support, structured field capture, supported formats, operational complexity, hosting and security model, cost, and fit with our staged-review scoring workflow.
4. Recommend a preferred approach, including whether OCR should be tenant-hosted, vendor-hosted, or hybrid, and identify prerequisites, risks, and the likely implementation shape for TASK-34.
5. Record the recommendation in the backlog task with enough detail to drive implementation or a deliberate fallback decision if OCR is still not reliable enough.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
