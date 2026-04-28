---
id: TASK-13.4
title: Repair core domain service unit test drift
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
priority: high
ordinal: 4013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Repair failing unit tests for core domain services in `tests/unit/services/` where the behavior directly affects business workflows: contests, categories, scoring, certifications, assignments, results, winners, users, auth, and related tenant-aware service logic. This track should address drift between current service behavior and stale test assumptions without pulling in unrelated infrastructure concerns.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Failing core domain service unit tests are repaired or aligned to current business rules
- [ ] #2 Prisma/mock setup reflects current tenant-aware and cache-aware service behavior
- [ ] #3 Core domain service unit tests pass consistently as a targeted group
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Use the TASK-13.1 inventory to isolate the service tests tied to core workflow behavior.
2. Fix stale mocks and assertions first, especially around tenant scoping, cache invalidation, and new guardrails.
3. Only change service runtime behavior when the failure exposes a real regression rather than a stale unit expectation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
This is the highest-risk repair track because changes can affect real business behavior. Prefer targeted expectation updates over broad production refactors. If a service family is especially unstable, split it again rather than widening a single patch.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
