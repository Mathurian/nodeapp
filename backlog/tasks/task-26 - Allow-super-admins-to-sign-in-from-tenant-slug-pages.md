---
id: TASK-26
title: Allow super admins to sign in from tenant slug pages
status: To Do
assignee: []
created_date: '2026-05-09 20:34'
updated_date: '2026-05-09 21:00'
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
