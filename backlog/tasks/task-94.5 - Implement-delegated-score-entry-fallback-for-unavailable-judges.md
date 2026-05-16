---
id: TASK-94.5
title: Implement delegated score entry fallback for unavailable judges
status: To Do
assignee: []
created_date: '2026-05-16 22:18'
labels:
  - permissions
  - authorization
  - scoring
  - fallback
  - ocr
dependencies: []
parent_task_id: TASK-94
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Provide the operational fallback path for scoring when judges cannot enter scores directly and OCR from TASK-34 is unavailable or not reliable enough. The system must support explicitly authorized delegates entering scores on behalf of one judge, multiple judges, or all judges within an approved scope while preserving auditability, assignment controls, and the existing judge certification expectations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Define and implement a delegation model that can grant score-entry authority at the individual-judge, selected-judges, event, or tenant level with explicit grant, revocation, and expiry behavior.
- [ ] #2 Score-entry, score-file, and related review flows record who entered data, on whose behalf it was entered, and under which delegation authority, without collapsing delegated entry into ordinary judge self-entry.
- [ ] #3 The fallback path preserves the existing verification and certification requirements by making delegated entry a staged or attributable action rather than a silent replacement for the judge's own certification.
- [ ] #4 Permissions and UI behavior support operational assignment of delegated score-entry authority to appropriate fallback roles without requiring OCR to be implemented first.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
