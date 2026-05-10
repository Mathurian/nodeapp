---
id: TASK-44
title: Investigate and harden score submission/certification during network drops
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 03:49'
updated_date: '2026-05-10 04:05'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate why score entry during network interruption can result in certification succeeding while persisted score values are stale or zero, requiring an uncertify flow. Determine the exact failure path across frontend reliability/offline queue handling and backend certification behavior, then remediate so certification cannot lock incorrect score values.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Identify and document the exact failure mode(s) that can produce stale or zero persisted scores when the network drops during score submission.
- [ ] #2 Certification must not proceed while relevant score writes are queued, retrying, partially persisted, or otherwise not durably confirmed.
- [ ] #3 Blank or missing score inputs must not be coerced into persisted zero values unless zero was explicitly entered by the judge.
- [ ] #4 Add focused regression coverage for the identified network-drop/scoring/certification failure path.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the scoring failure path by tracing how score writes, offline queueing, and judge certification interact when network errors occur mid-submit.
2. Separate failure classes: blank-value coercion to zero, queued-but-not-persisted score writes, and category certification proceeding before durable score confirmation.
3. Implement guards so certification cannot run while score writes are queued/pending and score payloads do not silently coerce missing values to zero.
4. Add targeted regression tests for the identified submit/certify network-drop scenario and verify the scoring flow end to end.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Implemented frontend guards so blank scores are no longer coerced to zero and certification is blocked while writes are queued or syncing.
- Added backend certification prechecks for complete judge score coverage and rejected zero-row certification attempts.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
