---
id: TASK-67
title: Evaluate whether View Results should remain in the product
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 23:00'
updated_date: '2026-05-11 02:58'
labels:
  - results
  - audit
  - product
  - ux
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Determine whether the View Results page still serves a distinct supported purpose or whether it has been superseded by other results or winners flows and should be removed or consolidated.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The current View Results page usage, navigation entry points, role visibility, and overlap with other results surfaces are documented.
- [x] #2 The task produces a clear recommendation to keep, remove, or consolidate the page based on actual product behavior and user workflow fit.
- [x] #3 If the page is redundant or stale, follow-up implementation work is identified or completed so navigation and ownership stay coherent.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Document the current Results surface as-is: route, nav/dashboard/notification entry points, role filtering, and the concrete behaviors it provides beyond Winners (category drilldown, contest standings, score breakdowns, export/print, attachments).
2. Compare Results and Winners against the published-results visibility model to decide whether they serve different workflow purposes or should be consolidated.
3. If Results is still distinct, close the task with a keep recommendation and note that no navigation cleanup is needed; if any overlap remains confusing, record it as follow-up UX work instead of removing the page in this task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Audited the current /results surface across routing, navigation, dashboard quick actions, notifications, command palette entries, and e2e coverage.
- Confirmed ResultsPage is a distinct detailed-results drilldown: event/contest/category scoping, contest standings, category rankings, score breakdowns, export/print, minimum-winning-score display, and commentary attachments.
- Confirmed WinnersPage serves a different purpose: winners publication status, event/contest overview, and published winners visibility under a separate winners/progress access model.
- Recommendation: keep View Results. It is still an active, differentiated product surface and should not be collapsed into Winners. Any future confusion should be addressed as naming/UX work, not page removal.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reviewed the current View Results surface and recommend keeping it.

Findings:
- /results remains widely integrated through navigation, dashboard shortcuts, notifications, command palette actions, and automated test coverage.
- ResultsPage provides detailed scored-results workflows that WinnersPage does not: event/contest/category drilldown, overall contest standings, category-level rankings, score breakdowns, export/print, and commentary attachments.
- WinnersPage remains a separate publication and winners-visibility surface governed by different published-results visibility settings.

Outcome:
- Keep View Results as a distinct page.
- Do not consolidate it into Winners.
- If product language still feels overlapping, handle that as follow-up UX clarification rather than removal.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
