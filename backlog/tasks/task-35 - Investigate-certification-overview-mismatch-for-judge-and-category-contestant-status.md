---
id: TASK-35
title: >-
  Investigate certification overview mismatch for judge and category/contestant
  status
status: To Do
assignee: []
created_date: '2026-05-09 22:59'
updated_date: '2026-05-09 23:00'
labels:
  - certifications
  - bug
  - investigation
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate the certification flow bug shown in temp/bug-ss. The certification overview is not an accurate representation of the current status of judge certifications and category/contestant certification state. The task should identify the source of truth mismatch, determine whether the issue is in aggregation, backend status calculation, or frontend presentation, and capture the concrete fix path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Identify whether the defect originates in backend certification status calculation, overview aggregation, or frontend rendering/state handling.
- [ ] #2 Document the exact fix scope needed so a follow-up implementation task can be executed without re-investigating the bug.
- [ ] #3 Reproduce or otherwise validate the mismatch shown in temp/bug-ss and document the specific incorrect overview behavior.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
