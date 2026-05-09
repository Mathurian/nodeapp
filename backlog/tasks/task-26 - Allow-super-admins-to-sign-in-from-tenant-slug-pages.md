---
id: TASK-26
title: Allow super admins to sign in from tenant slug pages
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:34'
updated_date: '2026-05-09 22:49'
labels:
  - auth
  - multi-tenant
  - super-admin
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix tenant-slug login behavior so super admins can authenticate from a tenant-branded slug page when appropriate administrative access is intended. The flow should preserve tenant context without incorrectly blocking a platform-level administrator from completing sign-in.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A SUPER_ADMIN can successfully authenticate from a tenant slug login page when using valid credentials.
- [x] #2 The resulting session and redirect behavior preserve the correct tenant and administrative context.
- [x] #3 The change does not weaken tenant access controls for non-super-admin users or allow cross-tenant sign-in bypasses.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Adjust `AuthService.login()` so a tenant-slug login can fall back to cross-tenant discovery only for `SUPER_ADMIN` candidates, while keeping non-super-admin wrong-tenant logins blocked.
2. Propagate slug tenant context on authenticated frontend API requests so a super admin who signs in from `/:slug/login` stays scoped to that tenant during subsequent requests.
3. Add targeted auth tests for super-admin slug login success, preserve existing tenant-selection behavior for default login, and verify non-super-admin users still cannot bypass tenant scoping.
4. Run focused backend/frontend verification and record any unrelated auth harness issues.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Updated `AuthService.login()` so tenant-slug login pages can fall back to cross-tenant discovery for `SUPER_ADMIN` users only, while leaving non-super-admin wrong-tenant logins blocked.
- Added tenant-slug propagation to the shared frontend API client so authenticated requests from `/:slug/...` continue to send `X-Tenant-Slug` for super-admin tenant scoping.
- Added AuthService unit coverage for super-admin slug login success, preserved default-login tenant-selection behavior, and non-super-admin no-bypass behavior.
- Verification: `npx jest tests/unit/services/AuthService.test.ts --runInBand`, `cd frontend && npm run type-check`, `npm run build`, `cd frontend && npm run build`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed tenant-slug login handling for super admins. When a login request originates from a tenant slug page and no tenant-local user exists, the backend now performs a restricted cross-tenant fallback for `SUPER_ADMIN` accounts only. Default `/login` discovery still preserves the broader existing tenant-selection flow, and non-super-admin users still cannot use slug pages to bypass tenant scoping.

The frontend API client now automatically forwards the current URL tenant slug on authenticated requests so a super admin who signs in from `/:slug/login` stays scoped to that tenant during the session.

Tests:
- `npx jest tests/unit/services/AuthService.test.ts --runInBand`
- `cd frontend && npm run type-check`
- `npm run build`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
