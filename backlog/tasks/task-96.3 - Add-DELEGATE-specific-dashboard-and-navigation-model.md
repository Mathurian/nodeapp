---
id: TASK-96.3
title: Add DELEGATE-specific dashboard and navigation model
status: To Do
assignee: []
created_date: '2026-05-18 19:43'
labels: []
dependencies: []
parent_task_id: TASK-96
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current DELEGATE fallback-to-admin dashboard and shortcut behavior with a dedicated least-privilege experience focused on delegated scoring workflows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 DELEGATE users see a dedicated dashboard quick-action set instead of inheriting ADMIN actions by fallback.
- [ ] #2 Navigation and dashboard shortcuts for DELEGATE exclude admin, governance, reports, settings, and user-management surfaces unless explicitly intended.
- [ ] #3 The DELEGATE experience still exposes the minimum links needed to reach delegated scoring and related score-file workflow surfaces.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
