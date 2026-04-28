---
id: TASK-11
title: Upgrade exceljs export dependency chain
status: To Do
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-04-28 02:31'
labels:
  - npm
  - exports
  - backend
dependencies: []
priority: medium
ordinal: 11
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Upgrade the export/report dependency chain centered on `exceljs` while preserving current workbook generation behavior. Focus on `src/services/ExportService.ts`, `src/services/ReportExportService.ts`, and `src/jobs/ReportJobProcessor.ts`, and verify whether the newer chain removes the current `unzipper` / `fstream` / `fast-csv` deprecations. Keep this task limited to export/runtime compatibility, not general reporting feature changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Compatible exceljs upgrade path is identified
- [ ] #2 Export dependency chain is upgraded as far as safely possible
- [ ] #3 Report and export generation continue to work correctly
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current `exceljs` chain and identify the safest compatible upgrade target.
2. Upgrade the dependency chain and adapt export/report code only where required for compatibility.
3. Validate workbook generation through the current export and report paths.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
This task is about dependency remediation with behavior preservation. Avoid changing report features or output semantics unless required for compatibility.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
