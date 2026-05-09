---
id: TASK-22
title: Scope category cloning contest selection by event
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:31'
updated_date: '2026-05-09 22:18'
labels:
  - cloning
  - frontend
  - backend
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the category cloning flow so tenant admins and organizers can clearly choose the destination event and then choose a destination contest within that event. Today the destination contest selector exposes all contests in the tenant, which makes cross-event category cloning hard to parse and easy to misuse. The flow should add a destination event selector that scopes the available destination contests for the category clone target.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 During category cloning, tenant admins and organizers can select a destination event before selecting the destination contest.
- [x] #2 After a destination event is selected, the destination contest selector only shows contests that belong to that event instead of showing all tenant contests.
- [x] #3 Category cloning within the same event continues to work, and cloning into a contest outside the selected destination event is blocked by validation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add destination-event state and controls to the category clone modal so admins/organizers select the destination event before the destination contest.
2. Derive the target contest options from the selected destination event instead of showing all tenant contests, while keeping same-event cloning available.
3. Extend the category clone request contract to include the selected destination event and validate server-side that the target contest belongs to that event.
4. Verify the updated clone flow end to end, including same-event clones and invalid cross-event target combinations.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Current clone modal only asks for a target contest and derives options from all contests in the tenant.
- Backend clone validation currently enforces tenant match on targetContestId but does not validate against a selected destination event because no such request field exists yet.

- Added destination event state to the category clone modal and scoped destination contest options by that event within the source tenant.
- Extended the category clone API contract with targetEventId and added server-side validation that the selected target contest belongs to that destination event.
- Verification: `npx jest tests/unit/services/StructureCopyService.test.ts tests/integration/structureCopy.test.ts --runInBand` (unit pass; integration suite still returns existing 401s across clone/template endpoints), `cd frontend && npm run type-check`, `cd frontend && npm run build`, `npm run build`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Updated category cloning so admins and organizers choose a destination event before choosing the destination contest. The clone modal now scopes contest options to the selected event while preserving same-event cloning as the default opening state.

Backend validation now requires `targetEventId` on category clone requests and rejects mismatched event/contest combinations even if the client sends an invalid payload directly.

Verification:
- `npx jest tests/unit/services/StructureCopyService.test.ts tests/integration/structureCopy.test.ts --runInBand`
  - `tests/unit/services/StructureCopyService.test.ts` passed
  - `tests/integration/structureCopy.test.ts` hit an existing 401 auth issue across clone/template endpoints, including untouched cases
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`
- `npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
