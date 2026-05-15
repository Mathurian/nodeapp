---
id: TASK-90
title: Investigate multi-tenant user membership and tenant-selection guidance
status: Done
assignee:
  - '@codex'
created_date: '2026-05-15 14:16'
updated_date: '2026-05-15 14:31'
labels:
  - documentation
  - auth
  - tenant
  - investigation
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit whether the product actually supports a single authenticated user account belonging to more than one tenant, how tenant context is established at sign-in, and whether current end-user documentation is describing a non-existent tenant-selection flow. This task should establish the real current behavior across authentication, tenant resolution, super-admin tenant administration, and user/tenant data modeling before any documentation or UX changes are made.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Document the current user-to-tenant data model and determine whether one user account can legitimately belong to multiple tenants at the same time.
- [x] #2 Trace the live sign-in and tenant-resolution flow to determine whether end users can choose among multiple tenants during authentication, or whether tenant context is fixed by URL, invitation, or admin reassignment.
- [x] #3 Clarify how super-admin tenant reassignment/management works today and whether it represents multi-tenant membership, tenant transfer, impersonation, or some other model.
- [x] #4 Identify every current user-facing doc or UI surface that implies multi-tenant user choice and record whether each instance is accurate, misleading, or stale.
- [x] #5 Produce a recommendation for the intended product language and any follow-up implementation or documentation tasks needed to align the system with reality.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the tenant-scoped user data model in Prisma and confirm whether the application represents multi-tenant access as multiple user rows, a membership join, or a single tenantId transfer model.
2. Trace the live authentication flow across login UI, auth controller/service, and tenant middleware to document exactly when tenant context comes from URL slug, default login discovery, header, token, or invitation.
3. Inspect the super-admin user-management and tenant-reassignment paths to determine whether they implement membership in multiple tenants or only move a user record between tenants.
4. Inventory every user-facing doc and UI surface that implies tenant choice or multi-tenant membership, starting with Getting Started and the login page, and classify each statement as accurate, conditional, or stale.
5. Summarize the real product model, recommend the correct user-facing language, and create follow-up tasks for any required doc or UX fixes once the investigation is complete.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Prisma user modeling is tenant-scoped, not membership-based: `User` has a required `tenantId` foreign key and `@@unique([tenantId, email])` in `prisma/schema.prisma`, with no `UserTenant` or membership join model found.
- Auth supports conditional tenant selection during default `/login`: `AuthService.login()` first searches the requested tenant, then from default-tenant context it searches active users by email across tenants and throws `TenantSelectionRequiredError` when the same credentials match multiple tenant-scoped user rows.
- Tenant selection is surfaced in the login UI and Help login modal through the `TENANT_SELECTION_REQUIRED` response path, which navigates the user to a tenant-specific login route.
- Tenant-specific login pages do not provide broad cross-tenant discovery for regular users; the cross-tenant discovery branch is intentionally limited to default login context, with tenant-specific fallback reserved to `SUPER_ADMIN` handling.
- Super-admin tenant management is a transfer model, not shared membership: the `PUT /users/:id/tenant` path simply updates `user.tenantId`, and the UI labels this as `Move User to Tenant`.
- Current wording drift found in `docs/02-GETTING-STARTED.md`, `docs/10-TROUBLESHOOTING.md`, and `frontend/src/pages/ForgotPasswordPage.tsx`, all of which say or imply a user can "belong to multiple tenants". That wording is misleading against the actual tenant-scoped user-row model, even though tenant selection during default login is a real behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Investigated whether the product supports true multi-tenant user membership versus tenant-scoped account selection.

Findings:
- The data model is tenant-scoped at the user row level. A user record belongs to exactly one tenant via `tenantId`; there is no membership join table that grants one user row simultaneous first-class membership in multiple tenants.
- The app does support a real tenant-selection flow, but only in a narrower sense: during default `/login`, if the same credentials match multiple active tenant-scoped user rows, the backend returns `TENANT_SELECTION_REQUIRED` and the frontend prompts the user to continue on the correct tenant login page.
- Super-admin tenant reassignment is implemented as moving a user record to a different tenant by updating `tenantId`, not as adding a second tenant membership.

Recommendation:
- Do not describe the system as if one user account simply "belongs to multiple tenants" in a general membership sense.
- Do describe the default-login behavior accurately: some users may be prompted to choose the correct tenant when the same credentials exist in more than one tenant-scoped account.
- Follow-up created: TASK-91 to update public/auth/help wording so it matches the actual tenant model without removing legitimate tenant-selection guidance.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
