---
id: TASK-2
title: Add reply-to fields to email settings backend
status: Done
assignee:
  - '@codex'
created_date: '2026-04-28 01:59'
updated_date: '2026-04-28 02:47'
labels:
  - email
  - backend
  - settings
dependencies:
  - TASK-1
priority: high
ordinal: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add tenant-aware reply-to settings without changing existing sender behavior. Extend the existing email settings transforms in `src/services/SettingsService.ts` and the existing settings API surface used by `src/controllers/settingsController.ts` so `reply-to address` and `reply-to name` can be read and written alongside the current SMTP, from-address, and from-name fields. Preserve the existing alias handling for `email_from_address` / `email_from_name`, and add equivalent canonical storage for the new reply-to fields. Scope is limited to settings persistence and retrieval only; sending behavior is handled in a later task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Email settings read API returns reply-to address and reply-to name fields
- [x] #2 Email settings update API persists reply-to address and reply-to name fields
- [x] #3 Existing tenants without reply-to settings continue to work unchanged
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the email settings key lists and transforms in `SettingsService` for reply-to address and reply-to name, following the existing alias pattern used for from-address and from-name.
2. Preserve the current API response shape and update behavior through the existing settings controller path instead of introducing a parallel endpoint.
3. Verify that tenants without the new keys still receive the current defaults and behavior, including fallback to existing from-address / from-name values only where current code already does so.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scope is limited to persistence and retrieval of settings. Do not change outbound mail construction, `testEmailSettings`, or frontend behavior in this task. Audit finding: there are currently no reply-to keys in `SettingsService`, so this task should define the canonical setting names that later runtime/UI tasks consume.

- Added reply-to field handling to `SettingsService` email settings transforms using canonical storage keys `email_replyToEmail` and `email_replyToName`, while exposing `email_reply_to_address` and `email_reply_to_name` through the existing API shape.
- Preserved existing from-address/from-name alias behavior and default behavior for tenants with no reply-to settings by returning empty strings for the new fields.
- Added unit coverage for reply-to defaults, canonical key reads, and canonical key writes in `tests/unit/services/SettingsService.test.ts`.
- Verified focused email settings Jest targets pass with explicit test secrets. A full run of the broader settings unit files still shows unrelated pre-existing failures/noise outside this task scope.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added backend support for tenant-aware reply-to email settings in the existing settings API path.

Changes:
- Extended `SettingsService.getEmailSettings` to read `email_reply_to_address` and `email_reply_to_name` alongside the existing SMTP and from fields.
- Mapped reply-to updates to canonical stored keys `email_replyToEmail` and `email_replyToName`, mirroring the current alias strategy used for sender fields.
- Preserved backward compatibility for tenants without reply-to settings by defaulting the new API fields to empty strings.
- Added focused unit coverage for default reads, canonical reply-to reads, and canonical reply-to writes.

Verification:
- `SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npm test -- --runTestsByPath tests/unit/services/SettingsService.test.ts -t "getEmailSettings|updateEmailSettings"`
- `SESSION_SECRET=test-session-secret CSRF_SECRET=test-csrf-secret npm test -- --runTestsByPath tests/unit/controllers/settingsController.test.ts -t "getEmailSettings|updateEmailSettings"`
- `npm run build`

Notes:
- Running the full settings unit files still surfaced unrelated pre-existing failures and environment noise outside the email-settings scope of this task.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
