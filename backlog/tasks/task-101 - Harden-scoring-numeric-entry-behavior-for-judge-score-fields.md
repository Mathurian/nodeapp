---
id: TASK-101
title: Harden scoring numeric entry behavior for judge score fields
status: Done
assignee:
  - '@codex'
created_date: '2026-06-02 03:44'
updated_date: '2026-06-02 20:50'
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
- [x] #1 Score inputs display their allowed range as 0 through the criterion or category maximum instead of only showing Max.
- [x] #2 Score inputs accept whole integers only and reject decimal entry, fractional values, and other non-integer score formats.
- [x] #3 Editing an existing score value must behave predictably and must not replace the field with an unintended value such as 6 during normal keyboard entry.
- [x] #4 Regression coverage or a repeatable verification path is added for the supported score-entry behaviors.
- [x] #5 Score inputs ignore mouse-wheel and trackpad scroll changes while focused or while the pointer is hovering over the field so accidental scrolling cannot alter a score.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the scoring value control in ScoringPage with an integer-only input strategy that avoids native number-input wheel and refocus quirks while preserving min/max validation.
2. Update score entry behavior so edits are explicit and predictable: clamp to 0..max, reject decimals and non-numeric characters, and prevent scroll wheel or trackpad hover/focus changes from mutating the value.
3. Change the scoring UI copy from Max-only labeling to a visible 0-max range for each criterion or category-total row.
4. Add focused regression coverage for integer-only entry, refocus editing behavior, and wheel protection using the most practical existing frontend test surface.
5. Verify with targeted frontend tests plus build or typecheck, then update backlog with any browser-specific residual risk.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- UAT detail: the accidental score-change behavior occurred across desktop and mobile browsers/devices.
- UAT detail: entering a digit, blurring the field, then immediately re-focusing and typing another digit could replace the existing value with an unintended 6.

- Replaced score fields on the scoring page with controlled text inputs using numeric input mode, integer-only key filtering, blur-time clamp-to-range normalization, and wheel suppression.
- Added stable scoring data-testids and updated Playwright scoring tests to drive the real category -> contestant -> score flow instead of assuming native number inputs.
- Tightened click/focus select-all behavior after browser verification showed the fast refocus path was still appending instead of replacing existing values.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented TASK-101 by hardening judge score entry on the scoring page.

Changes:
- Switched score entry in frontend/src/pages/ScoringPage.tsx away from native number inputs to controlled integer-only text inputs with numeric keypad hints, 0-max range labels, blur-time normalization, and wheel suppression.
- Added explicit click/focus select-all behavior so re-entering a score replaces the existing value instead of appending unpredictably.
- Normalized restored draft score values to strings and normalized submitted scores before mutation so the UI and payload stay consistent.
- Added stable selectors and targeted Playwright coverage in tests/e2e/scoring.e2e.test.ts for range display, integer-only entry, refocus replacement, and wheel protection.

Verification:
- cd frontend && npm run build
- npm run test:e2e:pw -- tests/e2e/scoring.e2e.test.ts --grep "reject decimal key entry for score fields|replace an existing score cleanly after refocus|ignore mouse wheel changes on score fields|validate score input" --workers=1
- git diff --check
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
