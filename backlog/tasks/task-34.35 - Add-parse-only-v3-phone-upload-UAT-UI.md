---
id: TASK-34.35
title: Add parse-only v3 phone upload UAT UI
status: To Do
assignee: []
created_date: '2026-05-25 23:47'
labels:
  - scoring
  - ocr
  - frontend
  - uat
dependencies:
  - TASK-34.34
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add an authenticated UI for the parse-only v3 UAT endpoint so real users can upload phone captures against existing event context and inspect parser results without modifying certified or uncertified scores.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authorized users can select event, contest, category, judge, and contestant context from existing assignments before uploading a phone-captured scoresheet image.
- [ ] #2 The UI clearly labels certified or locked categories as evaluation-only and exposes no submit, certify, overwrite, or draft-creation action for the parse-only flow.
- [ ] #3 The UI displays extracted rows beside stored judge scores when available, computed total, expected total, total delta, exact-row count, ambiguous/rejected rows, false high-confidence marks, anchor quality, mark quality, and quality-gate decision.
- [ ] #4 Upload conversion and parser failures show actionable messages that distinguish unsupported format, conversion failure, missing anchors, rejected marks, and missing ground truth.
- [ ] #5 The UI supports repeat UAT uploads for the same context without invoking the real import attempt-limit ledger or manual-entry fallback.
- [ ] #6 Frontend tests or smoke coverage verify the page can upload a fixture response, render comparison details, and does not expose mutation actions.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
