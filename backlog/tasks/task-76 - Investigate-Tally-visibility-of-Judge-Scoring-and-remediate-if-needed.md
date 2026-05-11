---
id: TASK-76
title: Investigate Tally visibility of Judge Scoring and remediate if needed
status: To Do
assignee: []
created_date: '2026-05-11 19:17'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate why users with the Tally role are currently able to see the Judge Scoring area, determine whether the issue is caused by navigation visibility, route guarding, permission evaluation, or backend access control, and remediate the behavior if the visibility is not intended.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Confirm whether Tally users can access Judge Scoring via navigation, direct route entry, or both.
- [ ] #2 Identify the source of the exposure in the frontend and/or backend permission model and document the root cause in implementation notes or final summary.
- [ ] #3 If Tally access is unintended, update the relevant visibility and/or authorization logic so Tally users no longer see or access Judge Scoring while intended roles retain access.
- [ ] #4 Run focused verification covering Tally behavior and at least one allowed Judge Scoring role after the change, or document if investigation finds no remediation is needed.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
