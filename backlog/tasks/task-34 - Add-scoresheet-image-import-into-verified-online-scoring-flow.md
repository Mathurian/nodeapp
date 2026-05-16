---
id: TASK-34
title: Add scoresheet image import into verified online scoring flow
status: To Do
assignee: []
created_date: '2026-05-09 21:15'
updated_date: '2026-05-16 20:01'
labels:
  - scoring
  - ocr
  - upload
  - frontend
  - backend
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the ability to take a photo of a paper scoresheet or upload a scoresheet image or file, extract scores and judge comments, and stage that data into the online scoring workflow. Imported score data must not be treated as final on ingestion; it should require human verification and the same signature and acceptance controls used by the current scoring flow before it is committed as accepted scoring data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authorized users can capture or upload a scoresheet image or supported file and submit it for score extraction.
- [ ] #2 Extracted scores and comments are staged for review so a user can verify or correct the parsed values before acceptance.
- [ ] #3 Imported scoring data only becomes accepted scoring data after the existing verification and signature flow is completed, and unverified imports are not treated as final results.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
