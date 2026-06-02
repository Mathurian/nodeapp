---
id: TASK-98
title: Investigate and remediate J2 login failure from OKCKW multi-user UAT
status: Done
assignee:
  - '@codex'
created_date: '2026-06-02 03:44'
updated_date: '2026-06-02 04:33'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review the login failure observed for the J2 user during live OKCKW tenant UAT, reproduce the failure mode, identify root cause across auth, tenant resolution, session, or browser-state paths, and ship a fix with regression coverage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Capture the exact failure mode for the affected J2 account/session from available logs or reproducible steps and determine whether the issue is user-specific, role-specific, tenant-specific, or environment-specific.
- [x] #2 Implement the smallest reliable fix for the confirmed root cause without regressing existing tenant-aware login behavior.
- [x] #3 Add regression coverage or a repeatable smoke path that proves the affected login flow succeeds after the fix.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Validate the production auth/account state for OKCKW J2 and confirm whether the login failure is caused by a missing or mismatched user account versus an auth code defect.
2. Trace the judge/user provisioning and admin password-reset paths to determine how a judge can exist without a corresponding login account and whether the current UI/API allowed that state silently.
3. Implement the smallest reliable remediation: fix the underlying code path or guardrail, and apply the necessary account repair for the affected tenant record.
4. Add focused regression coverage for the reproduced failure mode so judge/account provisioning and auth behavior do not regress.
5. Verify with targeted tests and a direct account-state check, then update task notes and summary with the root cause and remediation details.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- UAT detail: J2 received bad-credentials and related login failures even after an admin reset the password and the tester confirmed the username/password entry was correct.
- Scope the investigation across tenant-aware auth, password reset state, role/user record integrity, lockout state, and browser/session handling.

- Affected UAT account identifier: j2@okckinkweekend.com.

- Root cause confirmed from production data: J2's auth failure was caused by the login user row having been deleted on 2026-06-02 01:55:41 UTC by KW Admin, while the linked OKCKW judge record remained in place. Auth correctly failed because login resolves against users, not standalone judge records.
- Product defect confirmed in the JUDGE/CONTESTANT create path: create-user always created a fresh role record instead of adopting an existing same-email judge/contestant, while the update path already performed adoption.
- Remediation implemented: user creation now adopts and updates an existing same-email judge/contestant record before linking; hard deletion is blocked for users still linked to judge/contestant profiles so we do not create orphaned operational identities again.
- Regression coverage added in controller/service unit tests for judge adoption and linked-user deletion guard.
- Production account repair applied: recreated J2 user linked to judge cmlt3248y002s10ujs4tyx92h, then reset to a verified temporary password.
- Deployed backend fix in release 20260601231406.
- Verification: focused Jest suites passed, npx tsc --noEmit passed, npm run build passed, git diff --check passed, live service and HTTP smoke checks passed. Localhost login curl was not used as final proof because it returned 401 without corresponding auth audit/error rows, so account-state and hash verification were used instead.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resolved the OKCKW J2 login failure by fixing both the immediate production account state and the code paths that allowed the broken state to persist.

Changes:
- Updated user creation in usersController to adopt an existing same-email judge or contestant record instead of always creating a duplicate role record.
- Added a UserService delete guard that blocks hard deletion of users still linked to judge/contestant profiles, forcing deactivation or role-change workflows instead of orphaning operational identities.
- Added focused regression tests covering judge adoption during user creation and linked-user delete protection.
- Recreated the missing J2 user account in production, linked it to the existing OKCKW Judge2 record, reset it to a verified temporary password, and deployed the backend fix in release 20260601231406.

Verification:
- npx jest tests/unit/controllers/usersController.test.ts tests/unit/services/UserService.test.ts --runInBand
- npx tsc --noEmit
- npm run build
- git diff --check
- systemctl is-active event-manager.service
- curl -sSI http://127.0.0.1/
- curl -sSI http://127.0.0.1:3001/api/v1/auth/profile
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
