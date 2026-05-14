---
id: TASK-19.13
title: Evaluate skipped frontend accessibility tests
status: Done
assignee:
  - '@codex'
created_date: '2026-04-30 13:37'
updated_date: '2026-05-14 04:47'
labels:
  - tests
  - a11y
  - frontend
  - playwright
dependencies: []
parent_task_id: TASK-19
priority: high
ordinal: 21013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
frontend npm run test:a11y passed 8 tests but skipped 3 authenticated-page accessibility tests for Dashboard, Events list, and Settings page. The command is not a dummy pass, but authenticated-page a11y coverage is incomplete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The three skipped authenticated accessibility tests are reviewed and classified as fix, keep skipped with rationale, remove, or replace
- [x] #2 Authenticated-page accessibility tests run with reliable auth/setup, or the skip rationale is documented in the test code and backlog
- [x] #3 cd frontend && npm run test:a11y records expected pass/skip counts after the decision
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the current a11y suite pass/skip counts.
2. Review the skipped authenticated-page tests and decide whether to enable now or keep skipped with explicit rationale.
3. Add or link a follow-up if reliable authenticated a11y coverage needs separate setup work.
4. Re-run a11y and record expected counts.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reproduced current a11y behavior: 11 tests run, 8 passed and 3 authenticated-page scans skipped.
- Reviewed skipped tests: Dashboard, Events list, and Settings are valid desired coverage, but should not be enabled until Vite-only Playwright a11y has deterministic auth and tenant setup. Running them without that fixture risks scanning login redirects instead of authenticated pages.
- Classified all three skipped tests as keep skipped temporarily with explicit rationale and replacement/fix follow-up.
- Added TASK-19.23 to implement reliable authenticated frontend accessibility coverage.
- Updated test code to keep the tests visible while using runtime test.skip with a TASK-19.23 rationale.
- Verification: cd frontend && npm run test:a11y completed with 8 passed, 3 skipped in 25.5s.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Evaluated the skipped frontend accessibility tests and documented their handling.

Changes:
- Reviewed Dashboard, Events list, and Settings authenticated-page axe scans.
- Kept the tests skipped temporarily because the current Vite-only a11y setup lacks deterministic auth and tenant fixtures; enabling them now would risk scanning login redirects rather than the target pages.
- Added explicit in-code skip rationale pointing to TASK-19.23.
- Created TASK-19.23 to implement reliable authenticated frontend accessibility coverage.

Verification:
- cd frontend && npm run test:a11y: 8 passed, 3 skipped.

Decision:
- Classification for all three skipped tests: keep skipped temporarily with rationale, then replace with real authenticated scans under TASK-19.23.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
