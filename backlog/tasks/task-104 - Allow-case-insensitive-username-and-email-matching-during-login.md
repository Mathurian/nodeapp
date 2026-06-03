---
id: TASK-104
title: Allow case-insensitive username and email matching during login
status: Done
assignee:
  - '@codex'
created_date: '2026-06-02 04:00'
updated_date: '2026-06-02 05:25'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make authentication tolerant of email and username casing differences during sign-in so legitimate users are not rejected due to capitalization mismatches. Scope includes the backend login lookup path and regression coverage for mixed-case credential entry.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Login accepts email addresses regardless of casing differences between user input and stored value.
- [x] #2 If username-based login is supported, username matching is also case-insensitive during authentication.
- [x] #3 Authentication behavior remains tenant-safe and does not weaken multi-tenant account selection behavior.
- [x] #4 Focused regression coverage proves mixed-case login succeeds for valid credentials and still rejects invalid credentials.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the login validation schema and AuthService login branches to confirm whether authentication is email-only today and identify every lookup path that still uses case-sensitive matching.
2. Implement case-insensitive email matching across tenant-specific login and cross-tenant discovery branches without weakening tenant selection or invalid-credential behavior.
3. If username-based login is actually supported in the auth path, make that matching case-insensitive too; otherwise leave scope to email login and document that in the task notes.
4. Add focused AuthService regression coverage for mixed-case valid login, mixed-case invalid-password rejection, and multi-tenant discovery safety.
5. Verify with targeted Jest and TypeScript checks, then update backlog notes and summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Auth contract confirmed during implementation: login is email-only today via loginSchema and AuthController; there is no separate username login path to update in this task.
- Updated AuthService login to resolve email case-insensitively for same-tenant login, default-tenant discovery, and tenant-specific super-admin fallback paths.
- Preserved tenant safety by preventing cross-tenant discovery when the requested tenant already has one or more case-insensitive email matches. In that case, the flow stays tenant-bound and returns invalid credentials if no unique password match exists.
- Added focused AuthService regression coverage for mixed-case email login success and for the no-cross-tenant-fallback guard.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented case-insensitive email login matching without loosening tenant-scoped authentication behavior.

Changes:
- Updated AuthService login lookup to use case-insensitive email matching for same-tenant login resolution, default-tenant cross-tenant discovery, and tenant-specific super-admin fallback.
- Added a tenant-safety guard so cross-tenant discovery is not attempted once the requested tenant already has one or more case-insensitive email matches.
- Confirmed current auth is email-only, so no separate username login path required changes in this task.
- Added focused AuthService tests for mixed-case valid login and tenant-safe discovery behavior.

Verification:
- npx jest tests/unit/services/AuthService.test.ts --runInBand
- npx tsc --noEmit
- npm run build
- git diff --check
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
