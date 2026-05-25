---
id: TASK-34.38
title: Generalize v3 OMR templates beyond Education
status: To Do
assignee: []
created_date: '2026-05-25 23:48'
labels:
  - scoring
  - ocr
  - backend
  - print
dependencies:
  - TASK-34.32
  - TASK-34.36
parent_task_id: TASK-34
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After the v3 parse-only phone upload path is proven in UAT, remove Education-specific assumptions from the machine-readable template system so v3 sheets and parsing can support additional contest categories with their own criteria, score columns, and ignored regions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The v3 parser consumes template configuration for criteria, score columns, score grid geometry, version metadata, and ignored regions instead of relying on Education-only constants or template keys.
- [ ] #2 Template detection and explicit template selection remain fail-closed so unsupported categories are rejected rather than guessed.
- [ ] #3 The print/generation path can produce v3 sheets for additional categories only when a corresponding machine-readable template definition exists.
- [ ] #4 Regression coverage includes at least one non-Education v3 template fixture before that template can be enabled for UAT.
- [ ] #5 The rollout policy continues to report evidence by template/category and does not let Education reliability evidence certify other categories.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
