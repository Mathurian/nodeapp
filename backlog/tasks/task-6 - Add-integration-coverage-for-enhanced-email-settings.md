---
id: TASK-6
title: Add integration coverage for enhanced email settings
status: Done
assignee:
  - '@codex'
created_date: '2026-04-28 01:59'
updated_date: '2026-04-28 17:51'
labels:
  - email
  - tests
dependencies:
  - TASK-2
  - TASK-3
  - TASK-4
  - TASK-5
priority: medium
ordinal: 6
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add focused regression coverage for the enhanced email settings through integration and smoke-level checks. Cover tenant-aware settings persistence in the existing settings integration coverage, the admin settings save path where appropriate, and runtime header behavior for from-name and reply-to without depending on the currently broken low-level backend test suite. The goal is to prove the reply-to enhancement is additive and does not regress current SMTP/from-name behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Integration coverage verifies tenant-scoped reply-to settings persistence
- [x] #2 Runtime or smoke coverage verifies from-name and reply-to header behavior
- [x] #3 The test-email bypass is validated through integration or smoke checks
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add integration coverage in `tests/integration/settings.test.ts` for tenant-scoped email settings read/write of `email_reply_to_address` and `email_reply_to_name`.
2. Add a tracked smoke-level script under `scripts/uat/` that exercises `EmailService.sendEmail` with mocked SMTP/settings dependencies to verify from-name and reply-to headers without using the broken backend unit suite.
3. Extend the smoke script to cover `SettingsService.testEmailSettings` so the direct test-email bypass sends the same normalized Reply-To header.
4. Run the targeted integration test if the environment supports it, run the smoke script, and document any environment blockers.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Focus coverage on the additive reply-to enhancement and no-regression behavior for existing sender settings. Audit finding: the direct `testEmailSettings` path is a real bypass and needs explicit integration or smoke validation, not just shared `EmailService` coverage.

- Added a focused settings integration test that saves reply-to address/name through `/api/settings/email`, reads them back, and verifies tenant-scoped canonical rows `email_replyToEmail` / `email_replyToName`.
- Added `scripts/uat/email-settings-header-smoke.js`, a compiled-service smoke that mocks nodemailer and Prisma settings data, then verifies `EmailService.sendEmail` emits display-name From and Reply-To headers.
- Extended the same smoke to exercise `SettingsService.testEmailSettings`, including recipient trimming and Reply-To header construction on the direct test-email bypass.
- Verification: `npm run build` passed. `node scripts/uat/email-settings-header-smoke.js` passed.
- Targeted integration command attempted: `SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret JWT_SECRET=test-jwt-secret-key-for-testing npm run test:integration -- --runTestsByPath tests/integration/settings.test.ts --runInBand`. It is blocked by local database schema drift before the new test runs: Prisma reports `The column users.boardRole does not exist in the current database` while creating the test admin user.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added integration and smoke coverage for enhanced email settings without depending on the broken backend unit suite.

Changes:
- Extended `tests/integration/settings.test.ts` with a reply-to settings API round trip that saves tenant-scoped reply-to address/name, reads them back, and verifies canonical tenant rows are persisted.
- Added `scripts/uat/email-settings-header-smoke.js` to verify compiled `EmailService.sendEmail` emits display-name From and Reply-To headers from tenant settings.
- The smoke also verifies `SettingsService.testEmailSettings` applies the same From and Reply-To header behavior on the direct test-email bypass and trims the recipient address.

Verification:
- `npm run build`
- `node scripts/uat/email-settings-header-smoke.js`

Environment note:
- The targeted settings integration command was attempted with explicit test secrets, but the local database schema is out of sync: Prisma fails during test setup because `users.boardRole` is missing. The new integration coverage is present but cannot be executed successfully in this environment until the test database is migrated.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
