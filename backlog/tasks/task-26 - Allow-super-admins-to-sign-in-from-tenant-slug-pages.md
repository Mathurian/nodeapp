---
id: TASK-26
title: Allow super admins to sign in from tenant slug pages
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-09 20:34'
updated_date: '2026-05-09 22:30'
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
- [ ] #1 A SUPER_ADMIN can successfully authenticate from a tenant slug login page when using valid credentials.
- [ ] #2 The resulting session and redirect behavior preserve the correct tenant and administrative context.
- [ ] #3 The change does not weaken tenant access controls for non-super-admin users or allow cross-tenant sign-in bypasses.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Adjust `AuthService.login()` so a tenant-slug login can fall back to cross-tenant discovery only for `SUPER_ADMIN` candidates, while keeping non-super-admin wrong-tenant logins blocked.
2. Propagate slug tenant context on authenticated frontend API requests so a super admin who signs in from `/:slug/login` stays scoped to that tenant during subsequent requests.
3. Add targeted auth tests for super-admin slug login success, preserve existing tenant-selection behavior for default login, and verify non-super-admin users still cannot bypass tenant scoping.
4. Run focused backend/frontend verification and record any unrelated auth harness issues.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
