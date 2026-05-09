---
id: TASK-25
title: Fix email-based dynamic tenant login resolution
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:34'
updated_date: '2026-05-09 22:55'
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
- [x] #1 Users can complete email-based dynamic tenant login successfully when the email address belongs to a valid tenant user.
- [x] #2 Tenant resolution is correct for the resolved user and does not route the session into the wrong tenant context.
- [x] #3 Failures such as unknown email, ambiguous tenant mapping, or disabled access return clear and safe user-facing errors.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current default-login tenant-discovery response path from `AuthService` through `AuthContext` and `LoginPage` to confirm where tenant-selection details are being dropped.
2. Preserve the backend 409 tenant-selection contract and extend the frontend login flow to surface candidate tenants and route the user into the correct tenant-specific login path instead of showing a generic failure.
3. Keep safe failure messaging for unknown email, inactive access, and unresolved tenant mapping while ensuring successful single-match email discovery still completes login correctly.
4. Add targeted tests or verification around the tenant-selection handoff, then run focused auth/frontend checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Preserved the backend tenant-selection contract in `AuthContext.login()` by returning a structured tenant-selection result for the existing 409 `TENANT_SELECTION_REQUIRED` response instead of flattening it into a generic error.
- Updated `LoginPage` to prefill `email` from query params, show tenant-specific login choices when multiple tenant matches are returned, and route the user to `/:slug/login?email=...` without carrying the password across routes.
- Updated the Help page login modal to hand users off to the main login page when tenant selection is required and to surface frontend auth errors consistently.
- Verification: `npx jest tests/unit/services/AuthService.test.ts --runInBand`, `cd frontend && npm run type-check`, `cd frontend && npm run build`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the email-based dynamic tenant login handoff in the frontend. The backend already returned structured tenant-selection information for ambiguous cross-tenant email matches; `AuthContext` now preserves that result, and the default login page now presents tenant-specific login choices instead of collapsing the response into a generic failure.

When multiple tenant matches are returned, the user can choose the correct tenant login route and their email is carried into `/:slug/login` via query param for re-entry. Unknown email, inactive access, and other direct login failures still render as normal safe error messages.

Tests:
- `npx jest tests/unit/services/AuthService.test.ts --runInBand`
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
