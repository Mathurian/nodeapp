---
id: TASK-95
title: Add optional handwritten comments extraction for scoresheet imports
status: To Do
assignee: []
created_date: '2026-05-17 07:20'
updated_date: '2026-05-17 07:21'
labels:
  - scoring
  - ocr
  - comments
  - research
  - backend
  - frontend
  - future-release
milestone: m-2
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the deferred Phase 2 path for importing handwritten comments from uploaded paper scoresheets after the Phase 1 scores-only import is complete. This task is a future milestone release effort and should not block the scores-only delivery path. Extracted comments must remain review-required text before any persistence into the application workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A comment-import approach is selected for handwritten scoresheet comments, with explicit comparison of managed OCR, hybrid OCR-plus-LLM or vision-model, and any viable self-hosted options.
- [ ] #2 Extracted comment text is staged for human review and correction before it is attached to the scoring workflow.
- [ ] #3 The implementation does not block or complicate the Phase 1 scores-only import path and remains optional if comment accuracy is not sufficient.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
