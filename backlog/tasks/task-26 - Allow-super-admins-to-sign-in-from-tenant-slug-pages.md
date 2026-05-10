---
id: TASK-26
title: Allow super admins to sign in from tenant slug pages
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:34'
updated_date: '2026-05-10 03:50'
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
1. Reproduce the TASK-26 regression path in code by tracing tenant-slug super-admin login, post-login navigation, and the first protected requests (`/auth/profile`, `/auth/permissions`) that can trigger a 401 redirect.
2. Patch the session bootstrap so a successful tenant-slug super-admin login reliably establishes authenticated frontend state before protected-route permission checks can bounce the user back to login, without weakening tenant scoping.
3. Add focused verification for the super-admin slug login flow covering the post-login protected request path and confirm non-super-admin tenant-scoping protections still hold.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Updated `AuthService.login()` so tenant-slug login pages can fall back to cross-tenant discovery for `SUPER_ADMIN` users only, while leaving non-super-admin wrong-tenant logins blocked.
- Added tenant-slug propagation to the shared frontend API client so authenticated requests from `/:slug/...` continue to send `X-Tenant-Slug` for super-admin tenant scoping.
- Added AuthService unit coverage for super-admin slug login success, preserved default-login tenant-selection behavior, and non-super-admin no-bypass behavior.
- Verification: `npx jest tests/unit/services/AuthService.test.ts --runInBand`, `cd frontend && npm run type-check`, `npm run build`, `cd frontend && npm run build`.

- Regression report: production test from /OKCKW/login using default superadmin admin@revnatech.com redirects back to login with a browser 401 after sign-in.
- Initial investigation: TASK-26 backend slug fallback in AuthService appears intact; likely failure is the first authenticated frontend request after navigation rather than the credential lookup itself.

- Console trace confirmed login POST succeeded and the first failing request was GET /auth/permissions returning 401, which immediately triggered the frontend global 401 redirect back to /:slug/login.
- Adjusted frontend auth bootstrap so /auth/permissions 401 responses are treated like identity bootstrap probes rather than immediate hard redirects, and increased the permission hook retry window slightly to tolerate post-login cookie/session establishment timing.
- Verification: cd frontend && npm run type-check; cd frontend && npm run build.

- Deployed current TASK-26 workspace state to dev only by rebuilding backend and frontend in /srv/event-manager/dev and restarting event-manager-dev.service.
- Verification: systemctl is-active event-manager-dev.service; curl -sS http://127.0.0.1:3002/health; curl -sSI https://dev.conmgr.com/health.

- Investigated the remaining dev 401s and confirmed the access_token cookie was present on /auth/permissions, but auth was loading the user under the request override tenant RLS context instead of the token tenant context.
- Patched authenticateToken to use a token-tenant Prisma context for the initial user lookup and fresh session-version check; added auth middleware regression coverage for SUPER_ADMIN token-tenant authentication under tenant override requests.
- Verification: npx jest tests/unit/middleware/auth.test.ts --runInBand. Backend build still reports unrelated commentaryMode Prisma/type drift, but dist/middleware/auth.js emitted the hotfix and was restarted on dev.
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

Follow-up fix: authenticateToken now validates super-admin sessions against the token tenant context before applying tenant override request scope, which resolved the /auth/permissions 401 redirect loop on slug login.

Additional verification:
- `npx jest tests/unit/middleware/auth.test.ts --runInBand`
- Dev deploy verified via `event-manager-dev.service` restart and successful retest on `https://dev.conmgr.com/dev-testing/login`.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
