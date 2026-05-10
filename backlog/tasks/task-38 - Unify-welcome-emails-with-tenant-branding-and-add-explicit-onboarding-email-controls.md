---
id: TASK-38
title: >-
  Unify welcome emails with tenant branding and add explicit onboarding email
  controls
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-09 23:57'
updated_date: '2026-05-10 02:57'
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
- [ ] #1 Welcome emails, when enabled, resolve tenant branding, sender identity, support/reply-to details, and URLs from the correct tenant context for the created user record or initiating tenant flow.
- [ ] #2 Settings UI exposes an explicit welcome-email toggle and any necessary supporting copy so admins can control onboarding email behavior independently of Require Email Verification.
- [ ] #3 Backend runtime enforces the new welcome-email setting consistently for direct user creation, bulk creation/import, and any other supported onboarding paths that create user accounts.
- [ ] #4 The implementation defines the fallback behavior when tenant branding or sender settings are incomplete and avoids sending malformed or cross-tenant-branded emails.
- [ ] #5 Tests or equivalent verification cover tenant resolution, setting behavior, and the main onboarding paths; task notes document any remaining follow-up improvements if all logical enhancements are not shipped in the same change.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
