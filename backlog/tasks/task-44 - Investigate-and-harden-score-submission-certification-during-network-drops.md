---
id: TASK-44
title: Investigate and harden score submission/certification during network drops
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 03:49'
updated_date: '2026-05-10 04:14'
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
- [x] #1 Identify and document the exact failure mode(s) that can produce stale or zero persisted scores when the network drops during score submission.
- [x] #2 Certification must not proceed while relevant score writes are queued, retrying, partially persisted, or otherwise not durably confirmed.
- [x] #3 Blank or missing score inputs must not be coerced into persisted zero values unless zero was explicitly entered by the judge.
- [x] #4 Add focused regression coverage for the identified network-drop/scoring/certification failure path.
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

- Verification: `npx jest tests/unit/controllers/scoringController.test.ts --runInBand`, `cd frontend && npm run type-check`, and `cd frontend && npm run build` all passed locally.
- Not deployed yet; ready for dev deployment and network-drop retest.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented score submission/certification hardening for network-drop scenarios.

Changes:
- Frontend scoring flow now submits only explicit numeric scores, no longer coerces blank values to zero, and blocks certification while score or category-comment writes are queued, retrying, syncing, failed, or otherwise not durably persisted.
- Backend category certification now requires complete judge score coverage before certification and rejects zero-row certification attempts so certification state cannot advance on stale or missing score rows.
- Added targeted controller regression coverage for incomplete judge coverage and zero-row certification paths.

Verification:
- `npx jest tests/unit/controllers/scoringController.test.ts --runInBand`
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`

Deployment status:
- Implemented and verified locally.
- Not yet deployed; reopen if the next dev deploy/retest exposes remaining issues.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
