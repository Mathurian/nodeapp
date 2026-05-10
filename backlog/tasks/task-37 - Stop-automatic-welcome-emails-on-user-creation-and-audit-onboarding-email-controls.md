---
id: TASK-37
title: >-
  Stop automatic welcome emails on user creation and audit onboarding email
  controls
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 23:35'
updated_date: '2026-05-10 02:56'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and remediate unexpected welcome emails being sent to newly created users even when email verification is disabled. Confirm where the email is triggered, whether a UI setting exists to control it, and why the email branding does not match tenant branding. Align onboarding email behavior with the invite-only registration model and remove or gate unexpected sends.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 New user creation no longer sends an automatic welcome email unless an explicit supported product setting requires it.
- [x] #2 The investigation identifies and documents the current trigger path, whether a UI control exists, and how welcome-email branding was being derived.
- [x] #3 Settings and runtime behavior are consistent so disabling email verification does not still produce a generic welcome/verification email flow.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trace the new-user onboarding email path from user creation through EmailService and settings, and confirm how the current UI-exposed require-email-verification toggle relates to the actual send behavior.
2. Remove or explicitly gate automatic welcome email sending during user creation so invite-only onboarding does not emit generic welcome/verification mail when email verification is disabled.
3. Capture the investigation outcome in code/comments/tests as needed: current trigger path, absence or presence of a UI control for welcome emails, and why branding came from generic app/env email template defaults instead of tenant-specific branding.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Initial investigation: UserService.createUser unconditionally calls EmailService.sendWelcomeEmail after every successful user creation.
- Initial investigation: The settings UI exposes Require Email Verification, but I have not found a separate welcome-email setting; the welcome template is generic and uses env/global app name/support values rather than tenant branding.

- Removed the unconditional welcome-email send from UserService.createUser so new user creation no longer triggers generic onboarding mail.
- Confirmed the only related UI control is Require Email Verification in general settings; there is no separate welcome-email setting.
- Confirmed the previous welcome email used a generic template and env/global app values rather than tenant branding.
- Verified with targeted Jest suite: tests/unit/services/UserService.test.ts.

- Verified the user-creation email behavior remains gated after the prior implementation work.
- Confirmed the targeted user service coverage passes for the welcome-email suppression path.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Stopped automatic welcome emails during user creation and documented the trigger path mismatch.

Changes:
- Removed the unconditional welcome-email send from new user creation.
- Confirmed the UI exposes Require Email Verification but not a separate welcome-email control.
- Confirmed the previous onboarding email path used generic app/env branding rather than tenant-specific branding.

Verification:
- npx jest tests/unit/services/UserService.test.ts --runInBand
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
