---
id: TASK-107
title: Add contestant-scoped certified post-event report generation
status: Done
assignee:
  - '@codex'
created_date: '2026-06-04 00:01'
updated_date: '2026-06-04 18:10'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add first-class contestant-scoped report generation so operators can generate, preview, export, and email a certified-only report for a single contestant within a selected contest. This is separate from the existing contest/event report drilldown work and should provide a dedicated report shape rather than relying on preview-only drilldown.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Reports workspace supports selecting Event > Contest > Contestant for a contestant-scoped report.
- [x] #2 Contestant-scoped reports are limited to certified scores only.
- [x] #3 Generated contestant report includes all scored categories and criteria for the selected contestant within the selected contest.
- [x] #4 Generated contestant report includes applicable general commentary at the configured scope and judge-specific commentary/detail within the relevant sections.
- [x] #5 Contestant-scoped reports can be previewed, exported, and emailed using the existing report delivery workflow.
- [x] #6 Contestant-scoped report generation and visibility respect current report permissions and results visibility rules.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the reports contract so report generation, list filtering, stored scope metadata, and preview handling support a new contestant-scoped report type keyed by Event > Contest > Contestant.
2. Add backend report generation for a certified-only contestant report: gather the selected contestant's scored categories and criteria within the selected contest, resolve applicable general commentary by configured scope, include judge-by-judge detail and criterion comments, and preserve current report permission rules.
3. Update the reports workspace UI to support contestant selection after event and contest selection, generate the new report type, and show a dedicated structured preview that matches the contestant report shape while keeping export/email behavior unchanged.
4. Add focused regression coverage for backend generation, scope validation, and the contestant preview flow, then verify with targeted Jest, TypeScript/build, frontend build, and Playwright coverage.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added a first-class contestant report type to the reports contract, plus a reports-owned contestant options endpoint keyed to certified data for the selected contest.
- Implemented ReportGenerationService contestant report generation with certified-only filtering, per-category/per-judge criterion detail, and scoped commentary aggregation.
- Updated ReportsPage and reports API client to support Event > Contest > Contestant selection, contestant-specific preview rendering, and history filtering.
- Extended ReportExportService so contestant reports carry useful score and commentary detail through PDF, Excel, CSV, and email delivery.
- Added backend unit coverage for contestant report generation/controller handling and a Playwright contestant report generation flow.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented first-class contestant-scoped certified post-event reporting.

Changes:
- Added a new contestant report type generated from Event > Contest > Contestant scope and stored with contestant-aware scope metadata.
- Implemented certified-only contestant report generation with all scored categories and criteria for the selected contest, scoped general commentary, and judge-by-judge score/comment detail.
- Added a contest-scoped contestant options endpoint for the reports workspace and updated the reports UI to generate, preview, filter, export, and email contestant reports.
- Extended report exports so PDF, Excel, and CSV include contestant report detail instead of falling back to summary-only output.
- Added regression coverage in ReportGenerationService and ReportsController unit tests plus a Playwright flow for contestant-scoped generation and preview.

Verification:
- npx jest tests/unit/services/ReportGenerationService.test.ts tests/unit/controllers/reportsController.test.ts --runInBand
- npx tsc --noEmit
- npm run build
- cd frontend && npm run build
- npm run test:e2e:pw -- tests/e2e/reports.e2e.test.ts --grep "should generate a contestant-scoped certified report" --workers=1
- git diff --check
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
