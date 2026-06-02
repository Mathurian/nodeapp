---
id: TASK-104
title: Allow case-insensitive username and email matching during login
status: To Do
assignee: []
created_date: '2026-06-02 04:00'
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
- [ ] #1 Login accepts email addresses regardless of casing differences between user input and stored value.
- [ ] #2 If username-based login is supported, username matching is also case-insensitive during authentication.
- [ ] #3 Authentication behavior remains tenant-safe and does not weaken multi-tenant account selection behavior.
- [ ] #4 Focused regression coverage proves mixed-case login succeeds for valid credentials and still rejects invalid credentials.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
