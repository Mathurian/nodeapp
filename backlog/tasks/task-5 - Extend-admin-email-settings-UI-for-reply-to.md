---
id: TASK-5
title: Extend admin email settings UI for reply-to
status: Done
assignee:
  - '@codex'
created_date: '2026-04-28 01:59'
updated_date: '2026-04-28 14:43'
labels:
  - email
  - frontend
  - settings
dependencies:
  - TASK-1
  - TASK-2
priority: medium
ordinal: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the existing admin email settings screen in `frontend/src/pages/SettingsPage.tsx` so reply-to address and reply-to name can be edited alongside the current SMTP and sender fields. The existing UI already exposes From Address and From Name; this task should extend that section rather than redesign it. Reuse the current settings save flow and data model, keep the change additive, and include short explanatory copy clarifying the difference between `From` and `Reply-To` for administrators.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Settings UI shows reply-to address and reply-to name fields
- [x] #2 Reply-to fields save through the existing admin settings workflow
- [x] #3 Field help text explains from vs reply-to behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend `EmailSettings`, default `emailFormData`, and email settings query hydration with `email_reply_to_address` and `email_reply_to_name`.
2. Add Reply-To Address and Reply-To Name inputs alongside the existing From fields in `frontend/src/pages/SettingsPage.tsx`, reusing the current email save mutation.
3. Add concise administrator help text explaining that From controls the visible sender while Reply-To controls where replies are delivered.
4. Run frontend lint/build checks that are appropriate for this UI-only change.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
UI change should stay additive and reuse the existing save mutation rather than introducing a parallel settings workflow. Audit finding: From Name is already editable in the current screen, so the minimum implementation here is only to add reply-to fields and supporting help text.

- Extended the email settings form state, hydration, and save payload with reply-to address/name fields.
- Added Reply-To Address and Reply-To Name controls to the existing Email / SMTP Settings section.
- Added concise help text for From and Reply-To fields and associated edited labels with their controls.
- Verification: `cd frontend && npm run build` passed. `cd frontend && npm run lint` was attempted but fails on pre-existing repo-wide lint/a11y issues outside this task scope.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Extended the admin Email / SMTP Settings UI so administrators can configure optional Reply-To address and name values through the existing settings save flow.

Changes:
- Added `email_reply_to_address` and `email_reply_to_name` to the frontend email settings form model, defaults, and API hydration path.
- Added Reply-To Address and Reply-To Name inputs beside the existing sender fields in `SettingsPage.tsx`.
- Added short field help text clarifying that From controls the visible sender while Reply-To controls where replies are delivered.
- Added explicit label associations for the edited email sender/reply-to controls and made those rows responsive on small screens.

Verification:
- `cd frontend && npm run build`

Notes:
- `cd frontend && npm run lint` was attempted but is blocked by existing repo-wide lint/a11y failures unrelated to this change.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
