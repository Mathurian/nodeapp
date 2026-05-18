---
id: TASK-96.3
title: Add DELEGATE-specific dashboard and navigation model
status: Done
assignee:
  - '@codex'
created_date: '2026-05-18 19:43'
updated_date: '2026-05-18 19:54'
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
- [x] #1 DELEGATE users see a dedicated dashboard quick-action set instead of inheriting ADMIN actions by fallback.
- [x] #2 Navigation and dashboard shortcuts for DELEGATE exclude admin, governance, reports, settings, and user-management surfaces unless explicitly intended.
- [x] #3 The DELEGATE experience still exposes the minimum links needed to reach delegated scoring and related score-file workflow surfaces.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add an explicit DELEGATE dashboard profile in DashboardPage with a role greeting, description, and least-privilege quick actions focused on delegated scoring only.
2. Tighten DELEGATE nav visibility by excluding admin, governance, reports, settings, and user-management shortcuts from the DELEGATE role lists in navigation policy where those surfaces are not part of the intended fallback workflow.
3. Preserve access to the minimum intended DELEGATE surfaces: dashboard, profile, notifications, bios if still appropriate, and scoring-related entry points required for delegated scoring and score-file handling.
4. Verify the resulting behavior with frontend lint, type-check, and build, then redeploy so the DELEGATE dashboard and nav no longer imply admin-style capabilities.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added an explicit DELEGATE dashboard role profile in DashboardPage, including a delegate-specific greeting, description, and quick actions for delegated scoring, profile, and notifications.
- Removed the unsafe unknown-role fallback to ADMIN quick actions and replaced it with a minimal default action set.
- Filtered dashboard quick actions through allowed navigation IDs so the dashboard cannot imply access to routes hidden by policy, and changed the shared help card to show Settings only when allowed, otherwise Help Center.
- Verified with frontend eslint, type-check, and build, then deployed to production release 20260518145247.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the first DELEGATE least-privilege UX cleanup by adding an explicit delegate dashboard profile and removing admin-style shortcut leakage from the dashboard.

Changes:
- Added DELEGATE-specific greeting, description, and quick actions in DashboardPage.
- Replaced the previous unknown-role fallback to ADMIN quick actions with a minimal safe default.
- Filtered dashboard quick actions using allowed navigation IDs and hid the Settings shortcut for roles that do not actually have settings access.
- Deployed the frontend cleanup to production as release 20260518145247.

Verification:
- cd frontend && npx eslint src/pages/DashboardPage.tsx
- cd frontend && npm run type-check
- cd frontend && npm run build
- Production health check after deploy
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
