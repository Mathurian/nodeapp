---
id: TASK-34.29
title: Implement v2 anchor-and-bubble OMR extraction
status: To Do
assignee: []
created_date: '2026-05-25 16:39'
labels:
  - scoring
  - ocr
  - backend
dependencies:
  - TASK-34.28
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a simple deterministic extraction path for machine-readable v2 scoresheets using registration anchors and filled score mark regions instead of handwritten ink-density inference. Keep v1/current extraction unchanged and route by detected template version.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The import service detects v2 sheets by their template/version metadata and routes them to a separate v2 extractor without breaking v1/current import behavior.
- [ ] #2 The v2 extractor uses registration anchors to deskew/normalize the page and score mark regions to select criterion scores.
- [ ] #3 The extraction payload records v2 template version, anchor quality, mark quality, rejected rows, and confidence inputs needed for assurance decisions.
- [ ] #4 The v2 path rejects unclear or multi-mark rows instead of producing false high-confidence scores.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
