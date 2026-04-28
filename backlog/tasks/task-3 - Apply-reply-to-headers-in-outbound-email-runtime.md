---
id: TASK-3
title: Apply sender and reply-to headers in outbound email runtime
status: To Do
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-04-27 21:40'
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
- [ ] #1 Shared runtime config resolves reply-to address and reply-to name
- [ ] #2 Outbound mail includes reply-to only when configured
- [ ] #3 Outbound mail applies from-name when configured without changing the underlying from address
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
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
