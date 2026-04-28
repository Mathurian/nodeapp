---
id: TASK-6
title: Add test coverage for enhanced email settings
status: To Do
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-04-27 21:40'
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
Add focused regression coverage for the enhanced email settings. Cover the settings transforms and `testEmailSettings` bypass in `tests/unit/services/SettingsService.test.ts`, outbound header behavior in `tests/unit/services/EmailService.test.ts`, and the tenant-aware API surface in the existing settings integration coverage in `tests/integration/settings.test.ts`. The goal is to prove the reply-to enhancement is additive and does not regress current SMTP/from-name behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Settings service tests cover reply-to read and write behavior
- [ ] #2 Email service tests cover from-name and reply-to header application
- [ ] #3 Integration coverage verifies tenant-scoped email settings persistence
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add unit coverage for email settings transforms and the `testEmailSettings` bypass in `SettingsService`.
2. Add unit coverage for from-name and reply-to header application in `EmailService`.
3. Extend integration coverage in `tests/integration/settings.test.ts` for tenant-scoped settings read/write behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Focus coverage on the additive reply-to enhancement and on no-regression behavior for existing sender settings. Audit finding: the direct `testEmailSettings` path is a real bypass and needs explicit tests, not just shared `EmailService` coverage.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
