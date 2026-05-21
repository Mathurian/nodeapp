---
id: TASK-34.23
title: Implement conditional auto-submit and auto-certify for scoresheet imports
status: To Do
assignee: []
created_date: '2026-05-21 20:41'
labels:
  - scoring
  - ocr
  - backend
  - frontend
  - certification
dependencies:
  - TASK-34.20
  - TASK-34.21
  - TASK-34.22
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use the validated confidence-band policy and upload attestation to route scoresheet imports into auto-certify, auto-submit, full-review, or rejected outcomes without bypassing scoring authority or audit requirements.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Imports in the auto-certify band submit all extracted scores and certify them using the upload-time attestation only when the empirical calibration gate, extractor confidence gate, consensus gate where available, authorization checks, and score coverage checks all pass.
- [ ] #2 Imports in the auto-submit band submit extracted scores under the current acting user and judge context but still require normal manual certification afterward.
- [ ] #3 Imports in the full-review band keep the existing correction/review workflow before scores are applied.
- [ ] #4 Rejected imports do not create or modify accepted scores and integrate with the attempt-limit flow.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
