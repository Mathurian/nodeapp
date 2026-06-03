---
id: TASK-100
title: Add event and contest drill-in scoping to reports workspace
status: Done
assignee:
  - '@codex'
created_date: '2026-06-02 03:44'
updated_date: '2026-06-03 14:07'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the reports page so operators can progressively scope reporting from event to contest instead of relying on broader result sets, matching the expected post-event analysis workflow observed in UAT.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Reports users can scope into an event and then further scope into one or more contests within that event.
- [x] #2 The reports UI makes the active event and contest scope clear and uses those filters consistently across supported report views.
- [x] #3 Existing report behavior outside the new scoped workflow remains intact and regression-checked.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend report generation to understand scoped event reports by accepting optional contest IDs for event-type generation, validating those contests belong to the selected event and tenant, and preserving the chosen scope in the generated report payload or metadata without introducing a schema migration.
2. Refactor frontend/src/pages/ReportsPage.tsx so the workspace has explicit scope controls: event-first selection, contest options filtered to the active event, and clear active-scope presentation that applies consistently to generation and generated-report history.
3. Filter the generated report list and preview context by the active event and contest scope using the stored report payload metadata, while keeping system reports and unscoped behavior intact when no scope is selected.
4. Add focused regression coverage for scoped event-report generation and the reports page scope behavior using the most practical existing backend and frontend test surfaces, then verify with targeted build and test commands.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reporting enhancement is intended for post-event analysis workflows.
- The downstream contestant and judge drilldown is expected to operate within the event and contest scope selected in this task.

- Added scoped event-report generation support with optional contest IDs and tenant/event validation in the reports controller and generation service.
- Refactored the reports workspace to be event-first, with contest options constrained to the selected event and active scope messaging applied to generation, history, and preview context.
- Added scope metadata parsing/filtering for stored report instances and focused regression coverage in backend unit tests and reports Playwright coverage.
- Verification: npx jest tests/unit/controllers/reportsController.test.ts tests/unit/services/ReportGenerationService.test.ts --runInBand; npm run build; cd frontend && npm run build; npm run test:e2e:pw -- tests/e2e/reports.e2e.test.ts --grep "should support event to contest drill-in scope controls" --workers=1; git diff --check
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented event-first report scoping so operators can narrow reporting from event to contest without changing the report schema.

Changes:
- Added optional contest scoping for event report generation, including tenant-safe validation that selected contests belong to the chosen event and persisted scope metadata on generated payloads.
- Updated the reports workspace to show explicit event and contest scope controls, active scope status, and scope-aware generated report history and preview context.
- Added backend regression tests for scoped event generation and instance filtering, plus Playwright coverage for the new event-to-contest drill-in workflow.

Verification:
- npx jest tests/unit/controllers/reportsController.test.ts tests/unit/services/ReportGenerationService.test.ts --runInBand
- npm run build
- cd frontend && npm run build
- npm run test:e2e:pw -- tests/e2e/reports.e2e.test.ts --grep "should support event to contest drill-in scope controls" --workers=1
- git diff --check
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
