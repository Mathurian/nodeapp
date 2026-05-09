---
id: TASK-33
title: >-
  Allow tenant admins to create tenant-level event templates from an existing
  event
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-09 20:53'
updated_date: '2026-05-09 23:13'
labels:
  - templates
  - events
  - frontend
  - backend
milestone: m-0
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a backend event-template creation path that loads a tenant-owned event, derives contest/category/criterion structure from it, and persists a tenant-scoped event template.
2. Expose the new backend path through the event template controller/routes and add focused service coverage for happy path and tenant/not-found validation.
3. Add a clear UI action from the events page to create a template from an existing event, collect template name/description, and refresh the event templates flow after success.
4. Run focused backend tests plus frontend type-check/build, then close the task with AC/DoD updates and a final summary.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
