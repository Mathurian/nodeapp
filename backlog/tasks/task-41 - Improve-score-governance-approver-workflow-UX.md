---
id: TASK-41
title: Improve score governance approver workflow UX
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 01:18'
updated_date: '2026-05-10 02:49'
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
- [x] #1 Pending governance approval items are surfaced at or near the top of the page by default.
- [x] #2 The approver-facing layout reduces unnecessary scrolling and makes pending actions obvious.
- [x] #3 Approvers can still access supporting context and non-pending/history sections without losing required workflow information.
- [x] #4 The updated flow is verified for the approver roles that use governance.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current governance approver page layout and identify where pending actions are rendered versus supporting/history sections.
2. Rework the page so pending approvals and required actions render first, with summary/context below them and reduced scrolling.
3. Preserve all existing approver actions and context access while tightening labels, grouping, and navigation cues.
4. Run targeted frontend verification and capture any residual follow-up UX gaps.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Moved the governance request queue ahead of request creation and score review context.
- Defaulted the page to pending-focused filtering with completed requests hidden by default.
- Prioritized rows awaiting the current approver, added queue guidance, and highlighted actionable rows.
- Added a queue empty state and kept filter access to supporting/completed history.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reworked the score-governance approver page so pending approvals surface first and actionable rows are easier to process.

Changes:
- Moved the governance request queue to the top of the page ahead of settings, request creation, and score review context.
- Defaulted the view to pending-focused filtering and hid completed requests by default to reduce scrolling for approvers.
- Prioritized rows that the current approver can act on, highlighted them visually, and added a queue summary banner.
- Preserved access to request creation, review context, and completed/history filtering lower on the page.

Verification:
- cd frontend && npm run type-check
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
