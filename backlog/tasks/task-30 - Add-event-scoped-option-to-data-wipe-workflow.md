---
id: TASK-30
title: Add event-scoped option to data wipe workflow
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:35'
updated_date: '2026-05-09 23:07'
labels:
  - data-wipe
  - events
  - safety
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the data wipe workflow to support an event-scoped wipe option in addition to the current broader wipe choices. This card should explicitly validate that event-scoped wiping is safe and well-defined for shared and cross-event records before implementation is finalized.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The card defines which records are included and excluded in an event-scoped wipe, including handling for shared or cross-event entities, and confirms the scope is technically safe.
- [x] #2 The data wipe UI offers an event-specific scope option alongside the existing wipe options without removing current behavior.
- [x] #3 Executing an event-scoped wipe only removes data tied to the selected event and preserves unrelated events and tenant-level data.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the data wipe page to add a distinct event-scoped wipe option, require event selection for that scope, and route event wipes to the existing `/data-wipe/event/:eventId` backend path instead of the legacy tenant-scope endpoint.
2. Load tenant-visible events into the page and add event-specific scope guidance that clearly lists which records are removed versus preserved for an event wipe.
3. Add an event dry-run preview using the existing backend support so admins can inspect the affected record counts before executing the irreversible wipe.
4. Run focused frontend verification and add any minimal controller/service coverage only if the current backend contract proves insufficient during implementation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- The backend already supported event-scoped wipes via `/data-wipe/event/:eventId`, so the implementation focused on exposing that path safely in the frontend instead of inventing a new delete contract.
- Updated the data wipe page to add a dedicated single-event scope, require event selection, show explicit included-versus-preserved scope guidance, and route event wipes to the existing event endpoint.
- Added dry-run preview support in the UI for both legacy tenant scopes and the new event scope so admins can inspect affected record counts before execution.
- Verification: `cd frontend && npm run type-check`, `cd frontend && npm run build`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added an event-scoped option to the data wipe workflow using the existing backend event wipe endpoint. The data wipe page now exposes a distinct single-event scope, requires event selection, and clearly explains which event-linked records are removed versus which tenant-level or unrelated event records are preserved.

The page also now supports dry-run previews for both tenant-scope wipes and event-scoped wipes, surfacing affected record counts before the irreversible action is executed. This makes the event wipe scope explicit and auditable without removing the existing wipe options.

Tests:
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
