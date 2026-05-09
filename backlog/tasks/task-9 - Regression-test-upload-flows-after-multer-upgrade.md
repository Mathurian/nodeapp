---
id: TASK-9
title: Regression test upload flows after multer upgrade
status: To Do
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-05-09 21:01'
labels:
  - npm
  - tests
  - uploads
milestone: m-1
dependencies:
  - TASK-8
priority: high
ordinal: 9
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Validate the `multer` upgrade against the upload flows most likely to regress after middleware changes. Focus on targeted automated coverage and smoke validation for user image uploads, bio uploads, score file uploads, backup restore uploads, and CSV imports so the `multer` remediation can ship independently of the other npm work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Targeted tests cover user image and bio uploads
- [ ] #2 Targeted tests cover score file and backup restore uploads
- [ ] #3 Targeted tests cover CSV import uploads
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Map the highest-risk upload endpoints to targeted automated or smoke validation.
2. Add/adjust tests and fixtures for user image, bio, score file, backup restore, and CSV import flows.
3. Run the targeted regression pass and document any remaining route-specific issues.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation-focused task. Avoid widening this into another dependency-upgrade or route-refactor task unless a blocking defect is found.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
