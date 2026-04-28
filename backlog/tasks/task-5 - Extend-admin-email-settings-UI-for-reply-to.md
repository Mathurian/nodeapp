---
id: TASK-5
title: Extend admin email settings UI for reply-to
status: To Do
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-04-28 02:31'
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
Update the existing admin email settings screen in `frontend/src/pages/SettingsPage.tsx` so reply-to address and reply-to name can be edited alongside the current SMTP and sender fields. Reuse the current settings save flow and data model, keep the change additive, and include short explanatory copy clarifying the difference between `From` and `Reply-To` for administrators.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Settings UI shows reply-to address and reply-to name fields
- [ ] #2 Reply-to fields save through the existing admin settings workflow
- [ ] #3 Field help text explains from vs reply-to behavior
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the frontend email settings type, default state, and hydration path for reply-to fields.
2. Add reply-to inputs to the existing settings section and keep the save flow unchanged.
3. Add concise help text clarifying the difference between `From` and `Reply-To`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
UI change should stay additive and reuse the existing save mutation rather than introducing a parallel settings workflow.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
