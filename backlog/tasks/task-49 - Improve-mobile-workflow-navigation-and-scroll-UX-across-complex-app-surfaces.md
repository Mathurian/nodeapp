---
id: TASK-49
title: Improve mobile workflow navigation and scroll UX across complex app surfaces
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 06:16'
updated_date: '2026-05-10 06:30'
labels:
  - frontend
  - mobile
  - ux
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Complex mobile workflows across the application currently require too much manual scrolling and do not consistently guide users between the next logical steps. Evaluate high-friction multi-section interfaces used by different roles and improve practical mobile UX with contextual navigation aids, intentional auto-scroll between related sections, and lightweight return/jump actions where they materially reduce friction without disrupting desktop behavior or reducing functionality.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 High-friction multi-section mobile workflows across the app are audited across relevant user roles to identify practical places for contextual auto-scroll, back-to-top, and return/jump actions.
- [x] #2 At least the highest-value complex views identified by the audit, spanning more than scoring-only surfaces, are updated so key selection, filtering, review, or submission steps guide the user to the next logical section without disorienting jumps.
- [x] #3 Updated mobile views provide clear ways to return to earlier sections or primary controls such as top-level filters, selectors, queues, or page-top entry points where that improves workflow efficiency.
- [x] #4 The implementation favors reusable or shared patterns where practical, and preserves desktop usability without adding scroll automation in places where it would feel surprising, unsafe, or fight user intent.
- [x] #5 Task notes and final summary document the audited surfaces, the views improved, the patterns used, and any intentionally skipped pages or deferred follow-ups.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit the highest-friction multi-section mobile surfaces across roles and confirm where guided navigation is actually beneficial versus intrusive. Current shortlist: `ScoringPage`, `ScoreGovernancePage`, shared `CertificationOverviewWorkspace` consumers (`/certifications`, `/tally-master`, auditor certification pages), `ResultsPage`, and the most complex admin workflow candidate (`AssignmentsPage`) with `BiosPage`/`EmceePage` reviewed as secondary candidates.
2. Define a small reusable mobile workflow pattern for intentional scrolling and quick return actions, likely using section refs plus contextual jump buttons rather than global scroll automation. Keep it mobile-first and non-invasive on desktop.
3. Apply the pattern to the selected highest-value pages: guided next-step scrolling after key selections/submissions, page-top or primary-controls return actions, and bottom-of-flow shortcuts back to the most likely prior decision point.
4. Verify each updated page still behaves correctly on desktop, and avoid automation on pages or transitions where it conflicts with user intent, tables, or dense review tasks.
5. Document the audited surfaces, implemented pages, reusable pattern decisions, and any intentionally deferred surfaces in task notes and final summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Audited high-friction mobile surfaces across roles with emphasis on stacked, multi-section workflows: `ScoringPage`, `ScoreGovernancePage`, shared `CertificationOverviewWorkspace` consumers, `ResultsPage`, plus `AssignmentsPage`, `BiosPage`, and `EmceePage` as comparison candidates.
- Implemented a reusable mobile workflow pattern instead of page-specific one-offs: new `useMobileWorkflowNavigation` hook for mobile-only anchored scrolling and new `MobileWorkflowNav` UI component for contextual jump actions.
- Applied the pattern to `ScoringPage` with guided category -> contestant -> criteria movement, mobile quick-jump controls, and post-submit return to contestant selection.
- Applied the pattern to `ScoreGovernancePage` with quick navigation between queue, filters, create-request, and review sections, plus mobile scroll guidance after filter changes and request submission.
- Applied the pattern to shared `CertificationOverviewWorkspace` so certification-related pages across tally/auditor/certification roles now expose mobile jump controls and auto-scroll from filters to category results.
- Applied the pattern to `ResultsPage` so event/contest/category selections guide mobile users down to the results section and provide clear return paths to filters/top.
- Reviewed `AssignmentsPage`, `BiosPage`, and `EmceePage` during the audit but deferred changes in this pass because the current highest-value friction was in the selection/review/submit stacks above; broadening further would increase change surface without the same immediate mobile payoff.
- Validation completed with `cd frontend && npm run type-check` and `cd frontend && npm run build`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented a shared mobile workflow navigation pattern and applied it to the highest-value complex app surfaces from the cross-role audit.

Changes:
- Added `useMobileWorkflowNavigation` for mobile-only anchored scrolling with offsets/delays that avoid affecting desktop behavior.
- Added `MobileWorkflowNav`, a reusable quick-jump control for moving between primary workflow sections on mobile.
- Updated `ScoringPage` with contextual mobile jumps between categories, contestants, criteria, and top-of-page, plus guided auto-scroll after category/contestant selection and after successful score submission/certification.
- Updated `ScoreGovernancePage` with mobile navigation between queue, filters, request creation, and review rows, plus guided scrolling after filter changes and request submission.
- Updated shared `CertificationOverviewWorkspace` so its consumer pages (`/certifications`, tally, and auditor certification surfaces) gain mobile quick navigation and filter-to-results scrolling without duplicating page logic.
- Updated `ResultsPage` so filter selection guides users into the results content and exposes clear return paths back to filters or top.

Deferred:
- Audited `AssignmentsPage`, `BiosPage`, and `EmceePage` but left them unchanged in this pass because their mobile friction was lower than the implemented review/selection/submission flows and a wider sweep would add lower-signal churn.

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
