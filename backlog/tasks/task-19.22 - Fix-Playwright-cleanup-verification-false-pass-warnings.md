---
id: TASK-19.22
title: Fix Playwright cleanup verification false-pass warnings
status: Done
assignee:
  - '@codex'
created_date: '2026-05-02 06:30'
updated_date: '2026-05-02 17:04'
labels:
  - tests
  - e2e
  - playwright
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Focused Playwright auth e2e execution now passes, but test cleanup reports remaining records and still exits green. Evaluate the cleanup verification path so leaked or intentionally preserved records are handled explicitly instead of producing a passing run with warning output.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Playwright e2e cleanup verification either passes cleanly or fails the run when unexpected records remain
- [x] #2 Intentional preserved records, such as seed tenants or baseline users, are excluded or documented so cleanup output is not misleading
- [x] #3 Focused auth e2e execution no longer emits cleanup verification failed warnings
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect TestDataFactory cleanup and verification to identify why focused auth e2e reports remaining users after cleanup.
2. Reproduce the focused auth e2e warning with the current code.
3. Fix cleanup verification so intentional preserved records are excluded and unexpected leftovers fail clearly.
4. Re-run focused auth e2e and record clean pass/fail evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Root cause: TestDataFactory.cleanup intentionally preserves tracked users in the shared default tenant, but verifyCleanup counted those preserved users as remaining records.
- Updated cleanup to report actual deleted user count and explicit preserved default-tenant user count.
- Updated verifyCleanup to use the same preservation rules for default-tenant users and the default tenant itself. Unexpected remaining tracked records now throw an error instead of returning false, preventing silent green e2e passes.
- Verification: focused auth e2e passed 1/1 and no longer emitted Cleanup verification failed or Test data cleanup verification failed. Output showed Cleaned 0 users and Preserved 9 default-tenant users.
- Verification: npm run test:typecheck passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed Playwright e2e cleanup verification so intentional default-tenant preservation is explicit and unexpected leftovers fail the run.

Changes:
- TestDataFactory cleanup now reports actual deleted users separately from preserved default-tenant users.
- Cleanup verification excludes preserved default-tenant users and the shared default tenant, matching cleanup behavior.
- Unexpected remaining tracked records now throw from verifyCleanup instead of returning false and letting tests continue green.

Verification:
- npm run test:e2e:pw -- tests/e2e/auth.e2e.test.ts --grep "should display login page" --project=chromium: 1 passed, no cleanup verification warning.
- npm run test:typecheck passed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
