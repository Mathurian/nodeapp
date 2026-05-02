---
id: TASK-19.20
title: Fix MFA integration dependencies and response assertions
status: Done
assignee:
  - '@codex'
created_date: '2026-05-01 01:33'
updated_date: '2026-05-01 15:34'
labels:
  - tests
  - integration
  - backend
  - mfa
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The TASK-19.4 rerun leaves `tests/integration/mfa.test.ts` failing with `speakeasy.totp is not a function`, 500 responses during MFA setup, and stale wrapped-response assertions. The global test setup currently mocks speakeasy for all suites, which is incompatible with integration tests that need real TOTP generation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 MFA integration runs use a real or integration-appropriate speakeasy implementation that supports `totp` generation and verification.
- [x] #2 MFA setup/enable/verify/disable/backup-code tests assert the current API response shape and pass targeted reruns.
- [x] #3 Any remaining MFA service failures are backed by response/body logs and split into narrower tasks.
- [x] #4 Full integration rerun records updated counts and no QueueService/Prisma teardown regression.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reuse the integration-like Jest run detection added in TASK-19.4 and stop globally mocking speakeasy for integration/contract tests.
2. Run `tests/integration/mfa.test.ts` with JSON output and inspect remaining response-shape or service failures.
3. Patch MFA integration assertions or production error handling only where the targeted evidence shows current behavior is wrong or stale.
4. Capture targeted and full integration counts, note any residuals, and complete TASK-19.20 only when MFA no longer contributes the dependency/assertion failure class.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Integration-like Jest runs now unmock speakeasy and qrcode so MFA setup can generate real TOTP secrets/QR data.
- Updated MFA integration helpers and assertions for wrapped setup/status/regenerate responses, current invalid-code success:false behavior, and the /api/auth/mfa/complete login flow.
- regenerateBackupCodes now returns 400 when MFA is disabled instead of surfacing a generic 500.
- Targeted rerun passed: tests/integration/mfa.test.ts, 1 suite / 17 tests.
- Full integration rerun after related fixes: 42/55 suites passed, 482/537 tests passed, openHandles=0; MFA no longer contributes failures.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed MFA integration dependency handling and stale response assertions.

Changes:
- Used real speakeasy/qrcode implementations for integration and contract test runs.
- Updated MFA integration tests to match current wrapped responses and the MFA login completion endpoint.
- Returned a controlled 400 for backup-code regeneration when MFA is disabled.

Tests:
- npm run test:integration -- --runTestsByPath tests/integration/mfa.test.ts --json --outputFile=temp/task-19.20-mfa-after-contract-fix.json
- npm run test:integration -- --json --outputFile=temp/task-19.17-full-after-fix.json (remaining failures outside MFA; openHandles=0)
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
