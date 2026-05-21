---
id: TASK-34.17
title: Evaluate client-side capture assistance after scan normalization
status: To Do
assignee: []
created_date: '2026-05-21 19:13'
labels:
  - scoring
  - ocr
  - frontend
dependencies: []
parent_task_id: TASK-34
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add client-side camera preview or capture assistance for scoresheet import only if backend scan-normalization calibration shows a measurable reliability benefit. This preserves the backend-first validation path and keeps mobile capture work gated by TASK-34.16 results.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Backend scan-normalization calibration results are reviewed before any client-side camera scanning or capture-preview implementation begins.
- [ ] #2 If backend results justify client-side investment, the task defines capture guidance or preview quality cues for supported Education scoresheets using the same quality signals and review-burden metrics from TASK-34.14 and TASK-34.16.
- [ ] #3 If backend results do not materially improve reliability, the follow-up records that client-side capture assistance is deferred and does not expand the scoresheet import rollout scope.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
