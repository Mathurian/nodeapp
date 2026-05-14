---
id: TASK-19.31
title: Restore password reset Playwright flow baseline
status: Done
assignee:
  - '@codex'
created_date: '2026-05-02 21:41'
updated_date: '2026-05-14 04:47'
labels:
  - tests
  - e2e
  - playwright
  - auth
dependencies: []
parent_task_id: TASK-19
priority: high
ordinal: 13013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shard 1/4 of the TASK-19.28 Playwright rerun failed tests/e2e/auth.e2e.test.ts: should handle password reset flow. The test submitted the forgot-password form but did not observe the expected success feedback or navigation. Determine whether the current product response, mock email behavior, or test selector is stale and restore deterministic coverage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The password reset E2E test submits a deterministic existing-user email and verifies the current success, validation, or navigation behavior without relying on stale text.
- [x] #2 If backend email delivery or token generation must be mocked or seeded for E2E, the fixture setup is explicit and repeatable.
- [x] #3 A focused auth Playwright run records pass/fail counts and confirms the reset flow is not a dummy pass.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the auth Playwright password-reset test and current forgot-password UI/API behavior to identify the stale expectation.
2. Patch the test or supporting fixture so it uses deterministic seeded data and asserts the current success state without relying on obsolete copy.
3. Run a focused auth Playwright selection that includes the password-reset flow and record real pass/fail counts.
4. Close the task if the flow is restored; otherwise split any remaining product-vs-test mismatch into a narrower follow-up.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Identified two real causes behind the failing reset-flow test: the old assertion expected a generic alert or redirect instead of the current inline success state, and ForgotPasswordPage was using raw relative axios requests that bypassed the configured API base URL and failed under Playwright dev-server proxying.
- Switched ForgotPasswordPage to the configured public API client, fetched a CSRF token through the versioned API base URL, and posted the reset request with the expected tenant and CSRF headers.
- Tightened the Playwright reset-flow test to assert the actual forgot-password POST succeeds, the success copy is rendered, the email field is cleared, and the page remains on the forgot-password route.
- Verification: npx playwright test tests/e2e/auth.e2e.test.ts --project=chromium --workers=1 -g "should handle password reset flow" passed 1/1.
- Verification: npx playwright test tests/e2e/auth.e2e.test.ts --project=chromium --workers=1 passed 8/8.
- Verification: cd frontend && npm run type-check passed.
- Verification: npm run test:typecheck passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the Playwright password-reset flow against the current auth UI and request contract.

Changes:
- Fixed ForgotPasswordPage to use the configured public API base URL instead of raw relative axios paths, fetch a CSRF token, and submit the forgot-password request with the expected headers.
- Updated the auth Playwright reset-flow test to verify the real POST succeeds and the current success UI is rendered, instead of relying on a generic alert or redirect.

Tests:
- npx playwright test tests/e2e/auth.e2e.test.ts --project=chromium --workers=1 -g "should handle password reset flow": 1 passed / 0 failed.
- npx playwright test tests/e2e/auth.e2e.test.ts --project=chromium --workers=1: 8 passed / 0 failed.
- cd frontend && npm run type-check: passed.
- npm run test:typecheck: passed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
