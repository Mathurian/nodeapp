---
id: TASK-33
title: >-
  Allow tenant admins to create tenant-level event templates from an existing
  event
status: To Do
assignee: []
created_date: '2026-05-09 20:53'
labels:
  - templates
  - events
  - frontend
  - backend
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add support for tenant admins and organizers to create a tenant-level event template from an existing event. If the backend already supports this role and workflow, expose it clearly in the UI. If the backend does not yet support creating an event template from a current event, implement the missing backend and UI flow together. The goal is to let an admin start from a real event and save that structure as a reusable tenant event template.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tenant admins and organizers can start from an existing event and create a tenant-level event template from it through a clear UI workflow.
- [ ] #2 If backend support already exists, the UI exposes it correctly for the allowed roles; if it does not exist, the necessary backend support is implemented.
- [ ] #3 The resulting event template is tenant-scoped, preserves the intended reusable event structure, and is available in the normal event template management flow after creation.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
