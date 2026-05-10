---
id: TASK-60
title: Add event and contest scoping to shared bios directory
status: To Do
assignee: []
created_date: '2026-05-10 18:56'
updated_date: '2026-05-10 18:59'
labels:
  - bios
  - ux
  - scoping
  - emcee
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the canonical shared bios experience so users can scope the directory by event as well as contest, reducing noisy tenant-wide contest lists for emcees and other scoped roles while preserving the existing shared bios pattern.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The shared bios page supports selecting an event before or alongside contest selection, and the contest list is filtered to contests in the selected event.
- [ ] #2 The shared bios directory request/response contract supports event-aware filtering so contestant, judge, and role-based bios shown in the page respect the selected event scope.
- [ ] #3 Existing role-based scoping rules remain intact, including narrower judge/contestant visibility rules, while the new event filter improves UX for broader roles such as emcee.
- [ ] #4 Focused verification is added for event plus contest bios filtering behavior.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
