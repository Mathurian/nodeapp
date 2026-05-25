---
id: TASK-34.34
title: Build parse-only v3 phone upload UAT endpoint
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-25 23:46'
updated_date: '2026-05-25 23:49'
labels:
  - scoring
  - ocr
  - backend
  - uat
dependencies:
  - TASK-34.33
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a backend UAT path for real phone-photo uploads that runs the v3 parser and compares the result to existing stored scores without creating drafts, modifying scores, changing certification state, or bypassing certified category locks. This lets certified Education scores serve as ground truth while keeping production scoring data immutable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authorized users can upload a scoresheet image with event, contest, category, judge, and contestant context to a parse-only UAT endpoint.
- [ ] #2 The endpoint accepts JPEG/PNG plus HEIC/HEIF via server-side conversion before normalization, and returns clear errors for unsupported or failed conversions.
- [ ] #3 The endpoint initially enables only the explicit education_omr_v3 parser and does not infer or enable unsupported categories.
- [ ] #4 Certified or locked categories can be evaluated in parse-only mode, but the endpoint never creates ScoreFile records, score import drafts, score records, certifications, approval changes, or audit entries that imply score mutation.
- [ ] #5 The response includes extracted rows, computed total, comparison to stored judge scores when available, exact-row count, total delta, rejected rows, false high-confidence marks, anchor quality, mark quality, quality-gate decision, and retry/manual-entry routing recommendation.
- [ ] #6 Automated tests prove the endpoint is non-mutating and that upload conversion plus v3 parsing returns the expected UAT response shape.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
