---
id: TASK-3
title: Apply reply-to headers in outbound email runtime
status: To Do
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-04-28 02:31'
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
Extend the shared outbound email runtime to understand reply-to settings while preserving existing from-address behavior. Update the runtime config resolution and mail construction in `src/services/EmailService.ts`, including `resolveSmtpRuntimeConfig` and `sendEmail`, so configured reply-to values are included only when present. This task should not change UI or introduce new validation rules beyond what is required for safe runtime handling.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Shared runtime config resolves reply-to address and reply-to name
- [ ] #2 Outbound mail includes reply-to only when configured
- [ ] #3 Existing from-address and from-name behavior remains unchanged
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the shared SMTP runtime config model to include reply-to values.
2. Update `EmailService.sendEmail` mail construction so reply-to is included only when configured.
3. Verify that existing from-address and from-name behavior remains unchanged for current tenants.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Keep the behavior additive. Blank or missing reply-to values should result in no `replyTo` header, not a changed `from` header.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
