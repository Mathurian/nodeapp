---
id: TASK-13
title: Restore unit test suite baseline
status: To Do
assignee: []
created_date: '2026-04-27 21:47'
updated_date: '2026-04-28 19:26'
labels:
  - tests
  - unit-tests
  - backend
dependencies: []
priority: medium
ordinal: 13
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Parent task for bringing the backend unit test suite back to a reliable green baseline. The current unit suite spans 183 files across controllers, services, middleware, config, security, and utils, so the work should stay split into a baseline audit, focused repair tracks, and a final full-suite validation pass. This parent task exists to keep that structure explicit and to avoid mixing unrelated test drift into feature work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The baseline audit subtask is completed
- [ ] #2 The focused unit-test repair subtasks are completed
- [ ] #3 The full unit suite is rerun and residual failures are documented or fixed
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Complete the baseline audit subtask to capture the current failure inventory.
2. Execute the focused repair subtasks by code area so changes stay small and reviewable.
3. Finish with a full `tests/unit` rerun and document the final baseline.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Umbrella task only. The concrete work is split into TASK-13.1 through TASK-13.5 so the suite can be repaired incrementally with low regression risk.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
