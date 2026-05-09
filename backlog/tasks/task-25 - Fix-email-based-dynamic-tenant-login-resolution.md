---
id: TASK-25
title: Fix email-based dynamic tenant login resolution
status: To Do
assignee: []
created_date: '2026-05-09 20:34'
labels:
  - auth
  - multi-tenant
  - login
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the email-based dynamic tenant login flow so tenant resolution and sign-in behave correctly when the user starts from an email-driven login path. This card should cover the current non-functioning path end to end, including tenant identification, auth handoff, and user feedback.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Users can complete email-based dynamic tenant login successfully when the email address belongs to a valid tenant user.
- [ ] #2 Tenant resolution is correct for the resolved user and does not route the session into the wrong tenant context.
- [ ] #3 Failures such as unknown email, ambiguous tenant mapping, or disabled access return clear and safe user-facing errors.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
