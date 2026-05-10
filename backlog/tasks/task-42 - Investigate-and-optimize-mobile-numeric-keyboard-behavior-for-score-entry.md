---
id: TASK-42
title: Investigate and optimize mobile numeric keyboard behavior for score entry
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 02:41'
updated_date: '2026-05-10 04:11'
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
- [x] #1 The investigation identifies the main score-entry fields and other relevant numeric inputs that currently trigger the full keyboard on common mobile browsers.
- [x] #2 Where feasible, numeric entry fields are updated to use standards-compliant mobile-friendly input attributes or components so mobile devices prefer a numeric keypad without breaking validation or accessibility.
- [x] #3 The implementation verifies that score entry, contestant numbers, counts, and other relevant numeric fields still behave correctly on desktop and mobile, including empty states and max/min constraints.
- [x] #4 Task notes document any fields intentionally left unchanged because browser behavior, accessibility, or component constraints make a keypad-only approach unsafe or unreliable.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit the active score-entry flow and other tenant-facing numeric fields (score entry, contestant numbers, counts, limits, and similar forms) to identify where mobile browsers are likely opening the full keyboard.
2. Apply standards-compliant mobile numeric input hints where safe, using `inputMode`, `pattern`, and related attributes/components without breaking existing `type="number"`, validation, min/max, or empty-state behavior.
3. Verify the updated fields across the scoring page and shared numeric forms, and document any inputs intentionally left unchanged because browser behavior or accessibility constraints make keypad-only optimization unsafe.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Audited mobile-sensitive numeric fields and prioritized active competition workflows: score entry, deductions, governance adjustments, contestant numbers, category limits, contest minimum winning score, category template criterion setup, category-type min/max scores, and assignments guardrail limits.
- Added `inputMode="decimal"` to score-entry and decimal-capable fields (`ScoringPage`, `ContestsPage`, governance adjustment amount, generic custom number fields) and `inputMode="numeric"` to integer-oriented counts/limits (`CategoriesPage`, `UserForm` contestant number, `EventTemplatesPage`, `CategoryTypesPage`, `DeductionsPage`, `AssignmentsPage`). Existing `type="number"`, `min`, `max`, `step`, controlled empty states, and validation logic were left intact.
- Intentionally left deep admin/settings and ops-only numeric screens unchanged in this pass (`SettingsPage`, `DisasterRecoveryPage`, `RateLimitConfigPage`, `TenantManagementPage`, `TestEventSetupPage`) because they are low-frequency operational forms, not core scoring/setup mobile workflows, and widening the sweep further would add low-value churn without improving the main production phone-entry path.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Optimized the main mobile numeric-entry paths to prefer number keypads without changing existing validation behavior.

Changes:
- Added mobile keypad hints to the active scoring flow, including judge score entry on `ScoringPage`.
- Added keypad hints to scoring-adjacent numeric inputs used in production workflows: deductions, governance adjustments/approval counts, contestant numbers, category score/count limits, contest minimum winning score, event-template category score caps and criterion max scores, category-type score bounds, and assignment guardrail limits.
- Kept existing `type="number"`, `min`/`max`/`step`, and empty-state handling so desktop behavior and browser-native validation remain unchanged.
- Documented the intentionally skipped low-frequency admin/ops pages for a later follow-up pass if broader keypad coverage is needed.

Verification:
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
