---
id: TASK-99
title: Add contestant and per-judge commentary drilldown to post-event reports
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
Expand post-event reporting so operators can drill from report summaries down to individual contestants and then inspect per-judge scoring detail, including commentary, for certified post-event analysis.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Post-event reports can be broken down to the contestant level within the selected event or contest scope.
- [ ] #2 At the contestant level, users can further inspect judge-by-judge scoring detail for that contestant.
- [ ] #3 Judge-level contestant drilldown includes the relevant commentary alongside the numeric scores.
- [ ] #4 The new drilldown respects current results and permissions visibility rules for the requesting user.
- [ ] #5 Contestant-level and judge-level report drilldown uses certified scores only.
- [ ] #6 Commentary shown in contestant-level judge drilldown resolves to the most recent applicable saved commentary across the supported scope model, including event-scoped, contest-scoped, category-scoped, or criterion-scoped commentary as configured.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
