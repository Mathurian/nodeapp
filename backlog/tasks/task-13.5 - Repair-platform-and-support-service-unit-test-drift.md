---
id: TASK-13.5
title: Repair platform and support service unit test drift
status: To Do
assignee: []
created_date: '2026-04-27 21:47'
updated_date: '2026-04-28 18:39'
labels:
  - tests
  - unit-tests
  - services
dependencies:
  - TASK-13.1
parent_task_id: TASK-13
priority: medium
ordinal: 5013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Repair failing unit tests for platform and support services in `tests/unit/services/` that are not part of the core scoring workflow: email, notifications, exports, backups, files, cache, metrics, reporting, queueing, webhook delivery, and other infrastructure-oriented services. These tests often drift due to mock shape changes, external dependency wrappers, environment defaults, or queue/cache behavior, and can usually be repaired without touching core domain logic.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Failing platform/support service unit tests are repaired or aligned to current behavior
- [ ] #2 External dependency mocks are updated to current runtime contracts
- [ ] #3 Targeted platform/support service unit tests pass consistently as a group
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Use the TASK-13.1 inventory to isolate infrastructure-oriented service failures.
2. Normalize shared mocks for mail, storage, cache, queues, exports, and reporting before editing many individual tests.
3. Keep runtime fixes limited to genuine defects in adapter/wrapper behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
This track should absorb known drift from email, export, cache, backup, and reporting service tests. If one subsystem dominates the failures, split it into a child task rather than burying a large repair set here.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
