---
id: TASK-99
title: Add contestant and per-judge commentary drilldown to post-event reports
status: Done
assignee:
  - '@codex'
created_date: '2026-06-02 03:44'
updated_date: '2026-06-03 16:57'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expand post-event reporting so operators can drill from report summaries down to individual contestants and then inspect per-judge scoring detail, including commentary, for certified post-event analysis.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Post-event reports can be broken down to the contestant level within the selected event or contest scope.
- [x] #2 At the contestant level, users can further inspect judge-by-judge scoring detail for that contestant.
- [x] #3 Judge-level contestant drilldown includes the relevant commentary alongside the numeric scores.
- [x] #4 The new drilldown respects current results and permissions visibility rules for the requesting user.
- [x] #5 Contestant-level and judge-level report drilldown uses certified scores only.
- [x] #6 Commentary shown in contestant-level judge drilldown resolves to the most recent applicable saved commentary across the supported scope model, including event-scoped, contest-scoped, category-scoped, or criterion-scoped commentary as configured.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the report-generation data model for event and contest reports so the stored report payload can include structured drilldown sections: contest -> contestant -> judge -> category/criterion detail, using certified data only. 2. Add backend helpers to build that drilldown from the current scoring and commentary models: use finalized/certified score records, resolve the latest applicable judge commentary across event/contest/category scope, include criterion-level score comments where present, and keep the data constrained to the report's selected event/contest scope. 3. Update report download/preview handling and ReportsPage so post-event report previews can drill from summary into contestant-level rows and then into judge-by-judge detail with commentary, while preserving the existing export/email workflow. 4. Add focused regression coverage for certified-only filtering, commentary resolution, and the new report drilldown preview flow, then verify with targeted backend tests plus frontend build/e2e coverage.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Implemented certified-only report drilldown generation in src/services/ReportGenerationService.ts for event and contest reports.
- Added bulk judge-comment lookup and criterion comment resolution across category, contest, and event scoped commentary.
- Updated frontend/src/pages/ReportsPage.tsx to prefer structured contestant/judge drilldown previews when stored report payloads include drilldown data.
- Added backend unit coverage for certified-only drilldown/commentary resolution and a Playwright report preview regression for the structured contestant/judge view.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented contestant and per-judge post-event report drilldown on top of the existing reports workflow.

Changes:
- Extended event and contest report generation to attach structured drilldown payloads built from certified scores only.
- Resolved judge commentary from the configured event/contest/category scope and preserved criterion-level score comments in the drilldown payload.
- Updated the reports preview modal to render contest -> contestant -> judge -> category/criterion drilldown directly when that structured payload is present, without disturbing export/email behavior.
- Added regression coverage in ReportGenerationService unit tests and a Playwright reports preview flow using certified seeded data plus commentary.

Verification:
- npx jest tests/unit/services/ReportGenerationService.test.ts --runInBand
- npx tsc --noEmit
- npm run build
- cd frontend && npm run build
- npm run test:e2e:pw -- tests/e2e/reports.e2e.test.ts --grep "should preview contestant and judge drilldown for certified contest results" --workers=1
- git diff --check
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
