---
id: TASK-101
title: Harden scoring numeric entry behavior for judge score fields
status: To Do
assignee: []
created_date: '2026-06-02 03:44'
updated_date: '2026-06-02 03:50'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix the score-entry UX regressions observed during OKCKW UAT so score fields behave predictably on desktop and laptop browsers, prevent accidental changes, and enforce integer-only scoring input.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Score inputs display their allowed range as 0 through the criterion or category maximum instead of only showing Max.
- [ ] #2 Score inputs accept whole integers only and reject decimal entry, fractional values, and other non-integer score formats.
- [ ] #3 Editing an existing score value must behave predictably and must not replace the field with an unintended value such as 6 during normal keyboard entry.
- [ ] #4 Regression coverage or a repeatable verification path is added for the supported score-entry behaviors.
- [ ] #5 Score inputs ignore mouse-wheel and trackpad scroll changes while focused or while the pointer is hovering over the field so accidental scrolling cannot alter a score.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- UAT detail: the accidental score-change behavior occurred across desktop and mobile browsers/devices.
- UAT detail: entering a digit, blurring the field, then immediately re-focusing and typing another digit could replace the existing value with an unintended 6.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
