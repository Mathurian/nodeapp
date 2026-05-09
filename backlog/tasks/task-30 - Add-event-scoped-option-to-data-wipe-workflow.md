---
id: TASK-30
title: Add event-scoped option to data wipe workflow
status: To Do
assignee: []
created_date: '2026-05-09 20:35'
updated_date: '2026-05-09 21:00'
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
- [ ] #1 The card defines which records are included and excluded in an event-scoped wipe, including handling for shared or cross-event entities, and confirms the scope is technically safe.
- [ ] #2 The data wipe UI offers an event-specific scope option alongside the existing wipe options without removing current behavior.
- [ ] #3 Executing an event-scoped wipe only removes data tied to the selected event and preserves unrelated events and tenant-level data.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
