---
id: TASK-7
title: Document enhanced email sender settings
status: Done
assignee:
  - '@codex'
created_date: '2026-04-28 01:59'
updated_date: '2026-04-28 19:24'
labels:
  - email
  - docs
dependencies:
  - TASK-2
  - TASK-3
  - TASK-5
priority: low
ordinal: 9013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Document the enhanced sender settings for administrators after the backend and UI changes are in place. Update the admin/user-facing docs that already describe settings management so they clearly explain from address, from name, optional reply-to behavior, and how tenant-level values override global defaults. Keep the documentation aligned with the final implemented field names and behavior, including the fact that From Name already exists in the UI and becomes part of the actual emitted sender header after the runtime task lands.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admin documentation explains from address and from name
- [x] #2 Admin documentation explains optional reply-to behavior
- [x] #3 Documentation explains tenant override vs global default behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an Email / SMTP settings section to `docs/13-ADMIN-GUIDE.md` because it is the administrator-facing settings guide.
2. Document From Email Address, From Name, optional Reply-To Email Address, and optional Reply-To Name using the frontend/API field names and current defaults.
3. Explain runtime behavior: From Name is emitted in the sender header, Reply-To is omitted when no reply-to address is configured, and reply-to name requires a reply-to address.
4. Document tenant/global behavior: global values are defaults and tenant-scoped settings override them for that tenant.
5. Run markdown/diff checks appropriate for a docs-only change.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Documentation should follow the implemented behavior, not speculative behavior. Recheck field names and defaults before closing the task. Audit finding: clarify the difference between an administrator editing From Name in settings and the runtime actually using that display name in outbound mail after TASK-3.

- Added `docs/13-ADMIN-GUIDE.md` coverage for Email / SMTP sender settings, including `email_from_address` and `email_from_name`.
- Documented optional Reply-To behavior for `email_reply_to_address` and `email_reply_to_name`, including omission when no reply-to address is set and the validation rule for reply-to name.
- Documented global defaults versus tenant-scoped overrides for email settings.
- Updated the feature summary in `docs/03-FEATURES.md` so settings management mentions sender/reply-to configuration and tenant overrides.
- Verification: `rg` confirmed the documented field names and behavior are present; `git diff --check` passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Documented enhanced email sender settings for administrators.

Changes:
- Added an Email / SMTP Settings section to `docs/13-ADMIN-GUIDE.md` covering From Email Address, From Name, optional Reply-To Email Address, and optional Reply-To Name.
- Clarified runtime behavior: From Name is emitted in the sender header, Reply-To is omitted unless an address is configured, and reply-to name requires reply-to address.
- Documented global email settings as platform defaults and tenant-scoped settings as tenant-only overrides.
- Updated `docs/03-FEATURES.md` so the settings-management summary includes sender/reply-to configuration and tenant overrides.

Verification:
- `rg -n "Email / SMTP Settings|Reply-To|email_reply_to|email_from|tenant-specific override|tenant-specific overrides" docs/13-ADMIN-GUIDE.md docs/03-FEATURES.md`
- `git diff --check`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
