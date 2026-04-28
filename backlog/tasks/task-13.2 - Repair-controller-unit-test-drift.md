---
id: TASK-13.2
title: Repair controller unit test drift
status: To Do
assignee: []
created_date: '2026-04-27 21:47'
updated_date: '2026-04-28 18:39'
labels:
  - tests
  - unit-tests
  - controllers
dependencies:
  - TASK-13.1
parent_task_id: TASK-13
priority: high
ordinal: 2013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Repair failing controller-layer unit tests after the baseline audit identifies the current breakage. Scope includes files under `tests/unit/controllers/`, which currently covers 65 test files. Focus on controller-specific drift only: request/response mocks, updated service method signatures, changed error handling, tenant-aware request context, and authorization expectations. Keep controller fixes isolated from deeper service behavior changes wherever possible.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Failing controller unit tests are updated or fixed without widening scope into unrelated service logic
- [ ] #2 Controller mocks reflect current request context and service signatures
- [ ] #3 Controller unit tests pass consistently when run as a targeted group
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Use the TASK-13.1 inventory to identify failing controller files and cluster them by shared failure cause.
2. Fix stale controller test setup first: request/response mocks, tenant/user context, and expected service calls.
3. Only change production controller code where the test failure reveals a real controller defect rather than stale test assumptions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Prefer repairing the tests when runtime behavior is correct. If a controller bug is found, keep the production fix narrow and note any downstream service-test impact instead of folding multiple layers into one change.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
