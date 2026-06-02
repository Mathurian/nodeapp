---
id: TASK-98
title: Investigate and remediate J2 login failure from OKCKW multi-user UAT
status: In Progress
assignee:
  - '@codex'
created_date: '2026-06-02 03:44'
updated_date: '2026-06-02 03:56'
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
- [ ] #1 Capture the exact failure mode for the affected J2 account/session from available logs or reproducible steps and determine whether the issue is user-specific, role-specific, tenant-specific, or environment-specific.
- [ ] #2 Implement the smallest reliable fix for the confirmed root cause without regressing existing tenant-aware login behavior.
- [ ] #3 Add regression coverage or a repeatable smoke path that proves the affected login flow succeeds after the fix.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- UAT detail: J2 received bad-credentials and related login failures even after an admin reset the password and the tester confirmed the username/password entry was correct.
- Scope the investigation across tenant-aware auth, password reset state, role/user record integrity, lockout state, and browser/session handling.

- Affected UAT account identifier: j2@okckinkweekend.com.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
