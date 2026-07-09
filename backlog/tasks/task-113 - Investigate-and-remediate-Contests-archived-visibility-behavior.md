---
id: TASK-113
title: Investigate and remediate Contests archived visibility behavior
status: To Do
assignee: []
created_date: '2026-07-09 17:07'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Events page archived toggle was fixed because it only fetched active records and then tried to reveal archived items client-side. The Contests page appears to follow a similar pattern and may have the same problem. Investigate whether the Contests archived toggle and related contest list/archive views correctly fetch and display archived contests, then remediate any gaps found.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Investigate the Contests page archived toggle and related contest-list queries to confirm whether archived contests are being fetched and displayed correctly.
- [ ] #2 If a defect exists, update the Contests page and any affected API usage so archived contests appear correctly in explicit archived views without changing default active-only behavior.
- [ ] #3 Add or update verification coverage for the archived contest visibility behavior and document the outcome in the task notes/final summary.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
