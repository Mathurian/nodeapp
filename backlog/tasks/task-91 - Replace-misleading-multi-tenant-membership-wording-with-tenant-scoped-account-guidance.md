---
id: TASK-91
title: >-
  Replace misleading multi-tenant membership wording with tenant-scoped account
  guidance
status: To Do
assignee: []
created_date: '2026-05-15 14:26'
updated_date: '2026-05-15 14:31'
labels:
  - documentation
  - auth
  - tenant
  - help
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the current public/authentication documentation and related user-facing UI copy so it describes the real tenant model accurately. The product supports tenant selection during default login when the same credentials match multiple tenant-scoped user records, but the current wording implies a single user account can belong to multiple tenants in a first-class membership model. This follow-up should replace misleading membership language with tenant-scoped account and login-page guidance without removing legitimate tenant-selection behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Replace stale or misleading 'belong to multiple tenants' language in end-user documentation with wording that matches the real tenant-scoped account model.
- [ ] #2 Update public auth/recovery UI copy where needed so users understand when tenant-specific login or recovery pages matter and when a tenant-selection prompt may appear.
- [ ] #3 Preserve accurate tenant-selection guidance for the default login flow without implying unsupported multi-tenant account membership.
- [ ] #4 Verify revised wording across Getting Started, Troubleshooting, login, forgot-password, and any related help/auth surfaces for consistency.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
