---
id: TASK-13.3
title: 'Repair middleware, config, and utils unit test drift'
status: To Do
assignee: []
created_date: '2026-04-27 21:47'
updated_date: '2026-04-28 18:39'
labels:
  - tests
  - unit-tests
  - middleware
dependencies:
  - TASK-13.1
parent_task_id: TASK-13
priority: medium
ordinal: 3013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Repair failing unit tests in the lightweight infrastructure layers: `tests/unit/middleware/`, `tests/unit/config/`, `tests/unit/security/`, and `tests/unit/utils/`. These files tend to fail due to request-shape drift, timer behavior, rate-limit changes, logging side effects, config-default changes, or utility normalization updates. Keep this track narrow so support-layer repairs can land independently of controller and service fixes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Failing middleware/config/security/utils unit tests are repaired or updated to current behavior
- [ ] #2 Timer/mock/environment setup is stable for the affected tests
- [ ] #3 The targeted support-layer unit tests pass consistently when run together
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Use the TASK-13.1 inventory to isolate support-layer failures by shared cause: timers, request mocks, env defaults, cache/rate-limit behavior, or utility output drift.
2. Repair the smallest shared setup issue first before touching individual expectations.
3. Keep production changes limited to genuine defects in middleware/config/utils behavior.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
This track is a good place to remove brittle assertions and duplicated mock setup when the audit shows the same failure pattern across multiple files. Avoid mixing in controller/service fixes here.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
