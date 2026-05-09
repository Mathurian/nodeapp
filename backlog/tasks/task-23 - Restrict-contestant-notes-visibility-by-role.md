---
id: TASK-23
title: Restrict contestant notes visibility by role
status: To Do
assignee: []
created_date: '2026-05-09 20:32'
updated_date: '2026-05-09 20:50'
labels:
  - privacy
  - permissions
  - contestants
dependencies:
  - TASK-32
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure sensitive private contestant metadata such as ADA accommodations, letters of recommendation, and internal notes are only visible to authorized roles after that functionality exists in the application. This task focuses on role-based visibility and server-side enforcement for the new private contestant metadata experience, not on bios or headshots alone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Private contestant metadata is visible to ADMIN, ORGANIZER, and JUDGE users and hidden from unauthorized roles in the UI and API responses.
- [ ] #2 All private contestant metadata endpoints or payloads enforce the same role-based visibility rules server-side.
- [ ] #3 Unauthorized users cannot retrieve protected contestant metadata through direct requests, alternate views, exports, or existing bio/image flows.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
