---
id: TASK-19.17
title: Fix stale search and custom field integration route coverage
status: Done
assignee:
  - '@codex'
created_date: '2026-05-01 01:32'
updated_date: '2026-05-14 04:47'
labels:
  - tests
  - integration
  - backend
  - api
dependencies: []
parent_task_id: TASK-19
priority: high
ordinal: 35013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The TASK-19.4 integration rerun shows search and custom-field integration suites failing almost entirely with 404 responses, indicating the tests target stale paths or route registration has drifted. Use `temp/task-19.4-integration-after-users.json` and `temp/task-19.4-failure-digest.txt` as evidence, then align the integration tests or routes to the supported API contract.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `tests/integration/search.test.ts` no longer fails with 404s for the search endpoint group, or unsupported endpoints are removed/split with documented rationale.
- [x] #2 `tests/integration/custom-fields.test.ts` no longer fails with 404s for custom-field and field-value endpoint groups, or unsupported endpoints are removed/split with documented rationale.
- [x] #3 Targeted search/custom-field integration reruns record suite/test counts and response evidence.
- [x] #4 Full integration rerun records updated counts and no QueueService/Prisma teardown regression.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the search/custom-field integration failures and route registration.
2. Restore or add the supported route surface needed by the integration contract.
3. Preserve current API wrappers where production code expects them while adding legacy compatibility only at stale integration entry points.
4. Run targeted search/custom-field integration, build, and full integration JSON evidence before closing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added /api/search route registration and normalized search controller responses for the existing integration contract.
- Added legacy custom-field entity routes backed by the current custom field service, including field values and validation endpoints.
- Targeted rerun passed: tests/integration/search.test.ts and tests/integration/custom-fields.test.ts, 2 suites / 62 tests.
- npm run build passed after typed parser fixes in searchController.
- Full integration rerun after the fix: 42/55 suites passed, 482/537 tests passed, openHandles=0; remaining failures are covered by other 19.* tasks.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored stale search and custom-field integration route coverage.

Changes:
- Registered /api/search and adapted search controller request/response normalization for the existing integration contract.
- Added legacy-compatible custom field entity/value endpoints backed by the current custom field service.
- Preserved current service behavior while returning the raw shapes expected by the stale integration suites where needed.

Tests:
- npm run test:integration -- --runTestsByPath tests/integration/search.test.ts tests/integration/custom-fields.test.ts --json --outputFile=temp/task-19.17-targeted-clean.json
- npm run build
- npm run test:integration -- --json --outputFile=temp/task-19.17-full-after-fix.json (remaining failures outside this task; openHandles=0)
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
