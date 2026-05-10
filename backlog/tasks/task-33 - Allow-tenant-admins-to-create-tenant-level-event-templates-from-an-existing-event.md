---
id: TASK-33
title: >-
  Allow tenant admins to create tenant-level event templates from an existing
  event
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:53'
updated_date: '2026-05-09 23:29'
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
- [x] #1 Tenant admins and organizers can start from an existing event and create a tenant-level event template from it through a clear UI workflow.
- [x] #2 If backend support already exists, the UI exposes it correctly for the allowed roles; if it does not exist, the necessary backend support is implemented.
- [x] #3 The resulting event template is tenant-scoped, preserves the intended reusable event structure, and is available in the normal event template management flow after creation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a backend event-template creation path that loads a tenant-owned event, derives contest/category/criterion structure from it, and persists a tenant-scoped event template.
2. Expose the new backend path through the event template controller/routes and add focused service coverage for happy path and tenant/not-found validation.
3. Add a clear UI action from the events page to create a template from an existing event, collect template name/description, and refresh the event templates flow after success.
4. Run focused backend tests plus frontend type-check/build, then close the task with AC/DoD updates and a final summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added backend support to create a tenant-scoped event template from an existing event via /event-templates/from-event/:id.
- Extracted active contest, category, and criterion structure from the source event and persisted it in the existing event template payload format.
- Added an Events page modal workflow so admins can create a template directly from an event card.
- Verified with focused service tests plus frontend type-check/build and backend build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented event-to-template creation for tenant admins and organizers from the Events experience.

Changes:
- Added a new event template backend path that derives contests, categories, and criteria from a tenant-owned source event and saves them as a tenant-scoped event template.
- Exposed the workflow on event cards with a dedicated modal for template name and description, then posted to the new backend route.
- Added focused unit coverage for template creation from event structure, including tenant-scoped not-found handling and description fallback behavior.

Verification:
- npx jest tests/unit/services/EventTemplateService.test.ts --runInBand
- npm run type-check (frontend)
- npm run build (backend)
- npm run build (frontend)
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
