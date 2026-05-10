---
id: TASK-38
title: >-
  Unify welcome emails with tenant branding and add explicit onboarding email
  controls
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 23:57'
updated_date: '2026-05-10 03:21'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Design and implement a standards-compliant onboarding email flow for invite-only user creation. Welcome emails should, when enabled, resolve branding, sender identity, links, and content from the tenant that initiated user creation or from the tenant that owns the created user records after creation. Add explicit UI controls so admins can enable or disable welcome emails intentionally instead of relying on unrelated email-verification behavior. Review adjacent onboarding-email behavior and implement any logical standards-aligned improvements needed for consistency, safety, and maintainability.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Welcome emails, when enabled, resolve tenant branding, sender identity, support/reply-to details, and URLs from the correct tenant context for the created user record or initiating tenant flow.
- [x] #2 Settings UI exposes an explicit welcome-email toggle and any necessary supporting copy so admins can control onboarding email behavior independently of Require Email Verification.
- [x] #3 Backend runtime enforces the new welcome-email setting consistently for direct user creation, bulk creation/import, and any other supported onboarding paths that create user accounts.
- [x] #4 The implementation defines the fallback behavior when tenant branding or sender settings are incomplete and avoids sending malformed or cross-tenant-branded emails.
- [x] #5 Tests or equivalent verification cover tenant resolution, setting behavior, and the main onboarding paths; task notes document any remaining follow-up improvements if all logical enhancements are not shipped in the same change.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added an explicit `welcome_email_enabled` general setting and surfaced it in Settings so onboarding email behavior is independent from Require Email Verification.
- Updated EmailService to resolve tenant-aware onboarding email context: tenant app name, support email, reply-to-aware support contact, and tenant-scoped login URLs.
- Re-enabled welcome emails only through explicit runtime gating in direct user creation, admin bulk upload, and bulk import flows; invitation emails now also use the tenant email context without sharing the welcome toggle.
- Updated the welcome template copy to use a generic sign-in CTA instead of a misleading verification-only flow.
- Verified with targeted Jest coverage plus backend build, frontend type-check, and frontend build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented explicit, tenant-aware onboarding email control for active account creation flows.

Changes:
- Added `welcome_email_enabled` to general settings and exposed a dedicated Settings UI toggle independent of Require Email Verification.
- Updated EmailService to resolve tenant-branded onboarding context from tenant/global settings, including app name, support contact, sender/reply-to aware support details, and tenant-scoped login URLs.
- Wired direct user creation, users CSV bulk upload, and bulk user import to call the new gated welcome-email path without failing account creation if email dispatch has an operational issue.
- Updated invitation email dispatch to use the same tenant-aware email context and refreshed the welcome template so it uses a generic sign-in CTA rather than a verification-only message.

Verification:
- npx jest tests/unit/services/EmailService.test.ts tests/unit/services/SettingsService.test.ts tests/unit/controllers/usersController.test.ts tests/unit/controllers/BulkUserController.test.ts --runInBand
- npm run build
- cd frontend && npm run type-check
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
