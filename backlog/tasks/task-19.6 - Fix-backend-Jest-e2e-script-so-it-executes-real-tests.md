---
id: TASK-19.6
title: Fix backend Jest e2e script so it executes real tests
status: Done
assignee:
  - '@codex'
created_date: '2026-04-30 13:36'
updated_date: '2026-05-02 01:02'
labels:
  - tests
  - e2e
  - backend
  - ci
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
npm run test:e2e invoked Jest with tests/e2e but exited with No tests found because the Jest configuration ignores /tests/e2e/ and .e2e.test.ts files. The command is currently a failing release gate and does not execute coverage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 npm run test:e2e either runs the intended Jest e2e tests or is replaced with a correctly named script
- [x] #2 The command no longer fails with No tests found under the normal repository configuration
- [x] #3 If Jest e2e coverage is intentionally retired in favor of Playwright, package scripts and documentation reflect that clearly
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect Jest config, package scripts, and tests/e2e layout to determine whether backend Jest e2e files still exist.
2. Run the current npm run test:e2e failure mode after the contract script change baseline.
3. Update scripts or config so npm run test:e2e executes the intended e2e suite or clearly delegates to the Playwright e2e gate.
4. Verify npm run test:e2e no longer reports No tests found and record the result.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Confirmed tests/e2e files import @playwright/test and the project docs describe npm run test:e2e as the Playwright headless command. Jest config intentionally ignores /tests/e2e/ and .e2e.test.ts files, so the previous Jest-backed test:e2e script was a dead release gate.
- Updated package.json so npm run test:e2e delegates to playwright test. Kept npm run test:e2e:pw as an existing alias for compatibility.
- Verification: npm run test:e2e -- --list exits 0 and discovers 407 Playwright tests in 24 files. It no longer reports Jest No tests found.
- Residual Playwright reporter CSRF warnings during listing are left to TASK-19.7, which already covers Playwright web server startup and reporter CSRF failures.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the root e2e test script with the repository’s documented Playwright suite.

Changes:
- Changed npm run test:e2e from the ignored Jest tests/e2e path to playwright test.
- Verified the command now discovers the actual Playwright test inventory instead of failing with Jest No tests found.

Verification:
- npm run test:e2e -- --list: exits 0 and lists 407 tests in 24 files.

Follow-up:
- TASK-19.7 remains responsible for the Playwright runtime web-server and reporter CSRF failures.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
