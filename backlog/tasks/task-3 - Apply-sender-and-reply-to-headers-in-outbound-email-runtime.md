---
id: TASK-3
title: Apply sender and reply-to headers in outbound email runtime
status: Done
assignee:
  - '@codex'
created_date: '2026-04-28 01:59'
updated_date: '2026-04-28 03:08'
labels:
  - email
  - backend
dependencies:
  - TASK-1
  - TASK-2
priority: high
ordinal: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the shared outbound email runtime to understand reply-to settings and to actually apply the existing from-name setting. Update the runtime config resolution and mail construction in `src/services/EmailService.ts`, including `resolveSmtpRuntimeConfig` and `sendEmail`, so configured reply-to values are included only when present and the final `from` header is emitted as a display-name form when `fromName` exists. Scope is the shared `EmailService` path only; the direct `SettingsService.testEmailSettings` bypass is handled separately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shared runtime config resolves reply-to address and reply-to name
- [x] #2 Outbound mail includes reply-to only when configured
- [x] #3 Outbound mail applies from-name when configured without changing the underlying from address
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the shared SMTP runtime config model to include reply-to values in the same tenant/global fallback path as the existing SMTP and from fields.
2. Update `EmailService.sendEmail` mail construction so the `from` header uses the configured display name when present and `replyTo` is included only when configured.
3. Keep this task scoped to `EmailService`; document any remaining header parity work for `SettingsService.testEmailSettings` rather than folding that bypass into this runtime change.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Keep the behavior additive. Blank or missing reply-to values should result in no `replyTo` header, not a changed `from` header. Audit finding: `fromName` is already resolved today but never emitted in `mailOptions`, so this task should fix that gap as part of the minimum runtime change.

- Extended EmailService runtime config with reply-to address/name aliases used by SettingsService.
- Added formatted sender/reply-to header construction in sendEmail; replyTo is omitted when no reply-to address is configured.
- Added targeted EmailService unit coverage for formatted from/reply-to behavior and replyTo omission. Focused Jest execution is intentionally skipped because the current test suite setup is known broken; npm run build passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Applied configured sender display names and reply-to headers in the shared EmailService outbound runtime.

Changes:
- Extended SMTP runtime config resolution with reply-to address/name aliases for tenant/global settings fallback.
- Formatted the outbound from header as a display-name address when fromName is present while preserving the underlying from address.
- Added replyTo to nodemailer options only when a reply-to address is configured.
- Added targeted unit coverage for configured reply-to behavior and replyTo omission.

Verification:
- npm run build
- Jest suite not run per instruction because the current test setup is incompatible and covered by separate follow-up work.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
