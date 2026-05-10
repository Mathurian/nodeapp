---
id: TASK-59
title: >-
  Add configurable role-based published results visibility and event reveal
  control
status: To Do
assignee: []
created_date: '2026-05-10 18:56'
updated_date: '2026-05-10 18:59'
labels:
  - results
  - winners
  - permissions
  - product
  - emcee
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current hard-coded publish visibility assumptions with configurable role-based post-publication visibility rules and an event-level reveal control, so tenant admins can decide which roles may view published results or winners and whether event progress stays hidden until an event-level release moment.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Results and winners visibility is driven by configurable role-aware policy rather than only hard-coded contest-level checks for roles such as emcee and judge.
- [ ] #2 Admins can configure which roles may view published winners/results after publication, including currently restricted roles that share the existing publish gate behavior.
- [ ] #3 An event-level reveal or hide-progress control exists so designated roles such as emcees can be prevented from seeing winners/publication progress for an event until the event is fully released.
- [ ] #4 Emcee navigation and route access are aligned to the new policy, including removing or restricting View Results for emcees when that role is not allowed by configuration.
- [ ] #5 Focused verification covers pre-publish, post-publish, and event-reveal behavior across at least emcee, judge, and an admin-side privileged role.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
