---
id: TASK-19.32
title: Align certification unauthorized-access Playwright expectations
status: Done
assignee:
  - '@codex'
created_date: '2026-05-02 21:41'
updated_date: '2026-05-02 22:43'
labels:
  - tests
  - e2e
  - playwright
  - certification
  - authorization
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shard 1/4 of the TASK-19.28 Playwright rerun failed tests/e2e/certification.e2e.test.ts: should prevent unauthorized access to certification actions. The contestant context could still reach the judge certification route without the test observing an unauthorized message or redirect. Determine whether current route policy is too permissive or the test is checking a stale route/message.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The certification unauthorized-access test uses a deterministic non-privileged user and asserts the current expected route guard behavior.
- [x] #2 If product policy should block contestant access to judge certification actions, the route guard or permissions are fixed and covered.
- [x] #3 If product policy has changed, the test expectation is updated with clear rationale in implementation notes.
- [x] #4 A focused certification Playwright run records pass/fail counts for the unauthorized-access scenario.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the certification unauthorized-access Playwright test, current certification route behavior, and the seeded user context to identify whether the failure is a stale expectation or a real permission gap.
2. Patch the route guard or test assertion so a deterministic non-privileged user exercises the current intended authorization behavior.
3. Run a focused certification Playwright selection for the unauthorized-access scenario and record real pass/fail counts.
4. Run a broader certification file check if the focused fix lands cleanly, then close the task or split any residual gap.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reproduced the failure and confirmed the contestant was not bypassing authorization; the stale test was navigating to /judge/certification-workflow, which now falls through to the generic 404 page because it is no longer a routed frontend page.
- Verified the current product policy in TenantRouter and pageAccessPolicy: contestants are explicitly excluded from /certifications, and unauthorized authenticated users see the ProtectedRoute Access Denied state.
- Updated the Playwright test to exercise /certifications as the current certification workspace and assert the present Access Denied or redirect behavior for a contestant session.
- Verification: npx playwright test tests/e2e/certification.e2e.test.ts --project=chromium --workers=1 -g "should prevent unauthorized access to certification actions" passed 1/1.
- Verification: npx playwright test tests/e2e/certification.e2e.test.ts --project=chromium --workers=1 passed 11/11.
- Verification: npm run test:typecheck passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned certification unauthorized-access coverage with the current routed certification surface and authorization policy.

Changes:
- Replaced the stale /judge/certification-workflow unauthorized-access expectation with a check against /certifications, which is the current guarded certification workspace.
- Verified the product policy rather than changing it: contestants are excluded from certifications and see the Access Denied state from ProtectedRoute.

Tests:
- npx playwright test tests/e2e/certification.e2e.test.ts --project=chromium --workers=1 -g "should prevent unauthorized access to certification actions": 1 passed / 0 failed.
- npx playwright test tests/e2e/certification.e2e.test.ts --project=chromium --workers=1: 11 passed / 0 failed.
- npm run test:typecheck: passed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
