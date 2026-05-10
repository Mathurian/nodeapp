---
id: TASK-41
title: Improve score governance approver workflow UX
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 01:18'
updated_date: '2026-05-10 02:40'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The current governance UI is difficult for approvers to use because pending tasks are surfaced too low on the page and require excessive scrolling. Rework the page so pending approvals are prioritized visually and common approver actions are easier to reach and complete.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pending governance approval items are surfaced at or near the top of the page by default.
- [ ] #2 The approver-facing layout reduces unnecessary scrolling and makes pending actions obvious.
- [ ] #3 Approvers can still access supporting context and non-pending/history sections without losing required workflow information.
- [ ] #4 The updated flow is verified for the approver roles that use governance.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current governance approver page layout and identify where pending actions are rendered versus supporting/history sections.
2. Rework the page so pending approvals and required actions render first, with summary/context below them and reduced scrolling.
3. Preserve all existing approver actions and context access while tightening labels, grouping, and navigation cues.
4. Run targeted frontend verification and capture any residual follow-up UX gaps.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
