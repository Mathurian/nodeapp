---
id: TASK-34.2
title: Collect scoresheet samples and define OCR extraction schema
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-17 06:12'
updated_date: '2026-05-17 06:12'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prepare TASK-34 implementation by gathering representative paper scoresheet samples, confirming the canonical template or templates, and defining the extraction schema that OCR output must map into before staged review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A representative sample set is collected or otherwise defined for OCR validation, including handwritten and photo-captured scoresheets plus any known layout variants.
- [ ] #2 The canonical extraction schema is documented, including represented judge, contestant, criterion values, deductions, comments, and any paper-only markers that need special handling.
- [ ] #3 Any intake constraints or format gaps that affect OCR readiness, such as TIFF or HEIF support or file-size assumptions, are identified for implementation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refresh the current scoring, deductions, commentary, score-file, and delegated-entry schema from code so the OCR extraction contract maps to the real scoring model already in production.
2. Confirm whether any canonical paper scoresheet assets already exist in the repo; if not, define the representative sample packet required from operations, including clean scans, handwritten sheets, phone photos, and any known layout variants.
3. Document the extraction schema for OCR, including represented judge, contestant, criterion values, deductions, comments, and any paper-only markers that need review handling.
4. Identify current intake constraints and likely implementation gaps, including file-type support, file-size assumptions, and which follow-on OCR subtasks should own each required change.
5. Record the resulting schema and sample requirements so TASK-34.3 through TASK-34.5 can execute against a fixed contract instead of assumptions.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
