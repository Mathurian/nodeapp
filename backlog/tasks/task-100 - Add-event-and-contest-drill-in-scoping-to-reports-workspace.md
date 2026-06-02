---
id: TASK-100
title: Add event and contest drill-in scoping to reports workspace
status: To Do
assignee: []
created_date: '2026-06-02 03:44'
updated_date: '2026-06-02 03:50'
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
- [ ] #1 Reports users can scope into an event and then further scope into one or more contests within that event.
- [ ] #2 The reports UI makes the active event and contest scope clear and uses those filters consistently across supported report views.
- [ ] #3 Existing report behavior outside the new scoped workflow remains intact and regression-checked.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reporting enhancement is intended for post-event analysis workflows.
- The downstream contestant and judge drilldown is expected to operate within the event and contest scope selected in this task.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
