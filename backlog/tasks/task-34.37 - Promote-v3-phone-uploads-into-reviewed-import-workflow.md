---
id: TASK-34.37
title: Promote v3 phone uploads into reviewed import workflow
status: To Do
assignee: []
created_date: '2026-05-25 23:47'
labels:
  - scoring
  - ocr
  - backend
  - frontend
dependencies:
  - TASK-34.21
  - TASK-34.36
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After parse-only UAT proves the v3 phone upload path is reliable enough, connect the same conversion and parser path to the real reviewed-draft import workflow for categories that are still open for score entry. Certified or locked categories must remain blocked from score mutation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The real import flow accepts supported phone image formats and uses the same conversion, v3 fiducial normalization, and parser behavior proven by parse-only UAT.
- [ ] #2 The flow only creates score import drafts for categories and judge/contestant contexts that are open for score entry; certified or locked contexts are rejected before mutation.
- [ ] #3 Rejected uploads integrate with the TASK-34.21 attempt ledger and route the same acting user to manual entry after the attempt limit is reached.
- [ ] #4 Successful imports remain review-required unless TASK-34.20 and TASK-34.23 explicitly enable a stronger confidence band for the current calibration version.
- [ ] #5 The existing reviewed-draft workflow, authorization checks, audit behavior, and judge-context handling remain intact.
- [ ] #6 Integration/UAT coverage verifies an accepted reviewed draft, a rejected retry, a certified-category rejection, and same-user manual fallback after the attempt limit.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
