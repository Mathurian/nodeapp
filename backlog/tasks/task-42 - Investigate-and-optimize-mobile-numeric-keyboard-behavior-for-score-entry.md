---
id: TASK-42
title: Investigate and optimize mobile numeric keyboard behavior for score entry
status: To Do
assignee: []
created_date: '2026-05-10 02:41'
updated_date: '2026-05-10 02:42'
labels: []
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate score-entry and other relevant numeric input fields on mobile devices to determine where the UI is invoking the full keyboard instead of a numeric keypad. If feasible within the current form architecture and browser constraints, implement standards-compliant input configuration updates so score entry and other clearly numeric fields prefer the mobile number keypad while preserving validation, accessibility, and desktop behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The investigation identifies the main score-entry fields and other relevant numeric inputs that currently trigger the full keyboard on common mobile browsers.
- [ ] #2 Where feasible, numeric entry fields are updated to use standards-compliant mobile-friendly input attributes or components so mobile devices prefer a numeric keypad without breaking validation or accessibility.
- [ ] #3 The implementation verifies that score entry, contestant numbers, counts, and other relevant numeric fields still behave correctly on desktop and mobile, including empty states and max/min constraints.
- [ ] #4 Task notes document any fields intentionally left unchanged because browser behavior, accessibility, or component constraints make a keypad-only approach unsafe or unreliable.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
