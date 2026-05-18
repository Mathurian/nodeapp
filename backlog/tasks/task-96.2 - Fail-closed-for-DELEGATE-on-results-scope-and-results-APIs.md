---
id: TASK-96.2
title: Fail closed for DELEGATE on results scope and results APIs
status: Done
assignee:
  - '@codex'
created_date: '2026-05-18 19:28'
updated_date: '2026-05-18 19:30'
labels: []
dependencies: []
parent_task_id: TASK-96
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prevent DELEGATE users from triggering server errors in results APIs by returning empty scope and results payloads where the results access model does not support that role, and tighten frontend restricted-results handling accordingly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GET /api/v1/results/scope-options returns an empty scope payload for DELEGATE instead of a 500 error.
- [x] #2 DELEGATE results access paths return empty data instead of throwing when invoked.
- [x] #3 Frontend restricted-results handling treats DELEGATE like other restricted roles so the results nav can disappear when no accessible scope exists.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Identified DELEGATE login-time 500s from GET /api/v1/results/scope-options. The route only required results:read, but ResultsService still threw for unsupported roles.
- Updated ResultsService to fail closed for DELEGATE by returning empty scope/results payloads instead of throwing across scope, aggregate, and per-scope result accessors.
- Updated useResultsScopeOptions to treat DELEGATE as a restricted results role so navigation can hide the Results page when no accessible scope exists.
- Verified with ResultsService unit tests, backend build, frontend type-check, and frontend build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed DELEGATE-triggered 500s in results access by making the results service fail closed for unsupported delegate access and aligning the frontend results-scope hook with restricted-role behavior.

Changes:
- Updated ResultsService to return empty scope/results payloads for DELEGATE in aggregate, scope, contestant, category, contest, and event result accessors instead of throwing.
- Updated useResultsScopeOptions so DELEGATE is treated as a restricted results role, allowing navigation to hide Results when no accessible scope exists.
- Added ResultsService regressions for DELEGATE getAllResults and getScopeOptions behavior.
- Deployed the fix to production as release 20260518142910.

Verification:
- npx jest tests/unit/services/ResultsService.test.ts --runInBand
- npm run build
- cd frontend && npm run type-check
- cd frontend && npm run build
- Production health check after deploy
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
