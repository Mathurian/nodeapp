---
id: TASK-34.22
title: >-
  Add upload-time certification attestation for high-assurance scoresheet
  imports
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
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Capture certification intent at upload time so a high-assurance scoresheet import can submit and certify scores only when the acting user has provided a valid signature or attestation before processing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The upload flow can collect a typed, drawn, or file signature attestation for scoresheet import certification before extraction runs.
- [ ] #2 The attestation is applied only when the extraction qualifies for the auto-certify confidence band and the acting user is authorized to certify the selected judge context.
- [ ] #3 If extraction qualifies only for auto-submit or full-review, scores are not certified automatically and the existing certification flow remains required.
- [ ] #4 Audit data records the source upload, acting user, judge context, confidence band, calibration version, and attestation used for any auto-certification.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
