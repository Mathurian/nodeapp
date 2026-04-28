---
id: TASK-2
title: Add reply-to fields to email settings backend
status: To Do
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-04-28 02:31'
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
Add tenant-aware reply-to settings without changing existing sender behavior. Extend the existing email settings transforms in `src/services/SettingsService.ts` and the existing settings API surface used by `src/controllers/settingsController.ts` so `reply-to address` and `reply-to name` can be read and written alongside the current SMTP, from-address, and from-name fields. Scope is limited to settings persistence and retrieval only; sending behavior is handled in a later task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Email settings read API returns reply-to address and reply-to name fields
- [ ] #2 Email settings update API persists reply-to address and reply-to name fields
- [ ] #3 Existing tenants without reply-to settings continue to work unchanged
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the email settings key lists and transforms in `SettingsService` for reply-to address and reply-to name.
2. Preserve the current API response shape and update behavior through the existing settings controller path.
3. Verify that tenants without the new keys still receive the current defaults and behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scope is limited to persistence and retrieval of settings. Do not change outbound mail construction or frontend behavior in this task.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
