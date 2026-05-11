---
id: TASK-68
title: Fix winners page all-contests event overview behavior
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 23:00'
updated_date: '2026-05-11 02:19'
labels:
  - winners
  - frontend
  - results
  - ux
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
When a user selects an event and then chooses the all-contests option on the Winners page, the page should either show the promised event-level overview or the UI text and behavior should be corrected so the option is not misleading.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Selecting an event plus the all-contests option on the Winners page produces the documented event-level overview, or the option labeling and expectations are revised to match the actual supported behavior.
- [ ] #2 The page does not appear empty or misleading when all contests in an event are selected.
- [ ] #3 Any results aggregation or empty-state logic needed for the all-contests event scope is covered by focused verification.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
