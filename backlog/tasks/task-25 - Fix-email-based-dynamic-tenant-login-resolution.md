---
id: TASK-25
title: Fix email-based dynamic tenant login resolution
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-09 20:34'
updated_date: '2026-05-09 22:49'
labels:
  - auth
  - multi-tenant
  - login
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the email-based dynamic tenant login flow so tenant resolution and sign-in behave correctly when the user starts from an email-driven login path. This card should cover the current non-functioning path end to end, including tenant identification, auth handoff, and user feedback.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Users can complete email-based dynamic tenant login successfully when the email address belongs to a valid tenant user.
- [ ] #2 Tenant resolution is correct for the resolved user and does not route the session into the wrong tenant context.
- [ ] #3 Failures such as unknown email, ambiguous tenant mapping, or disabled access return clear and safe user-facing errors.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current default-login tenant-discovery response path from `AuthService` through `AuthContext` and `LoginPage` to confirm where tenant-selection details are being dropped.
2. Preserve the backend 409 tenant-selection contract and extend the frontend login flow to surface candidate tenants and route the user into the correct tenant-specific login path instead of showing a generic failure.
3. Keep safe failure messaging for unknown email, inactive access, and unresolved tenant mapping while ensuring successful single-match email discovery still completes login correctly.
4. Add targeted tests or verification around the tenant-selection handoff, then run focused auth/frontend checks.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
