---
id: TASK-34.3
title: Implement OCR provider integration and staged extraction pipeline
status: To Do
assignee: []
created_date: '2026-05-17 06:12'
updated_date: '2026-05-17 07:43'
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
