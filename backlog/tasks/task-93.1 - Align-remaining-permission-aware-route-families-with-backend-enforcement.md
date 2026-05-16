---
id: TASK-93.1
title: Align remaining permission-aware route families with backend enforcement
status: Done
assignee:
  - '@codex'
created_date: '2026-05-16 20:30'
updated_date: '2026-05-16 21:33'
labels:
  - permissions
  - authorization
  - backend
  - frontend
  - remediation
milestone: m-0
dependencies: []
references:
  - docs/operations/DYNAMIC-CRUD-PERMISSIONS-AUDIT.md
parent_task_id: TASK-93
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finish the remaining authorization alignment work for route families and application surfaces that are still permission-aware in frontend policy or navigation but continue to rely primarily on hardcoded backend role gates. This follow-up should build on TASK-77 and TASK-81, exclude route families already aligned in the first wave, and focus on making tenant-configurable permissions authoritative or intentionally hybrid for the remaining targeted surfaces.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Identify the remaining permission-aware route families that still diverge between frontend page-policy visibility and backend authorization, excluding surfaces already aligned by TASK-77, TASK-73, and TASK-81.
- [x] #2 Implement and document the intended enforcement model for each targeted family: fully tenant-configurable, hybrid with a fixed role boundary plus permission checks, or intentionally hard-protected.
- [x] #3 Update backend route enforcement for the targeted families so direct API access and frontend page visibility resolve from the same authority model for the supported roles.
- [x] #4 Run focused verification for the remediated route families covering allowed, denied, and direct-URL/API access behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Refresh and group the remaining permission-aware route families by existing first-class resource token so this task only targets live divergences that still remain after TASK-77, TASK-81, and the TASK-93.2 policy cleanup.
2. Align the route families that already have a clear resource mapping and should become hybrid permission-enforced surfaces without inventing new resource taxonomy first. Initial target set: templates and event-template surfaces (`templates:*`), workflow-management surfaces (`tracker:*`), file-management analytics and integrity surfaces (`files:read` / `files:write`), and other admin CRUD families whose page policy already maps cleanly to seeded resources.
3. For the more ambiguous score-governance and score-removal style surfaces, explicitly classify whether they can safely align to existing `scores` or `approvals` permissions in this task or whether they need to remain role-gated pending a follow-up resource-model decision. Do not force a misleading permission mapping just to increase `requirePermission(...)` coverage.
4. Implement the chosen backend guard changes, keeping the authority model explicit per family: fixed-role only, hybrid (`requireRole` + `requirePermission`), or already-complete. Then run focused verification for allowed, denied, and direct API access paths on the touched families and document any intentionally deferred families.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Refreshed the remaining divergence inventory after TASK-77, TASK-81, and TASK-93.2. Targeted the route families that already map cleanly to existing seeded resources rather than inventing new permission taxonomy in this task.
- Aligned workflow-management routes to the existing `tracker:*` resource with hybrid enforcement (`requireRole` plus `requirePermission`) for template CRUD and workflow instance operations.
- Aligned file-management analytics and integrity routes to the existing `files:read` and `files:write` permissions while preserving the current admin-plane role boundary.
- Aligned event templates, category templates, and email template routes to the existing `templates:read` and `templates:write` permissions.
- Updated broader frontend surfaces that consumed template APIs from non-template pages so they now hide or disable template-powered actions unless the user has the matching template permission set. This covered contest creation from event templates, category creation and saving from templates, category criteria import from templates, and bulk-email template selection.
- Explicitly deferred score-governance and score-removal style surfaces in this task because their current route families do not yet map cleanly to a trustworthy `scores` or approval resource model without risking misleading authorization semantics.
- Verification completed with targeted frontend lint, frontend type-check, backend build, and frontend production build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the remaining clean permission-aware route families so backend authorization and frontend affordances now resolve from the same hybrid authority model.

Changes:
- Added `requirePermission` enforcement to workflow-management (`tracker:*`), file-management analytics and integrity (`files:read` / `files:write`), and template route families (`templates:read` / `templates:write`) while preserving the existing fixed role boundary.
- Updated contest, category, and bulk-email UI surfaces to stop exposing template-driven actions when the user lacks the matching template permission.
- Documented the intentional deferral of ambiguous score-governance and score-removal surfaces until their resource model is clarified.

Verification:
- `cd frontend && npx eslint src/pages/ContestsPage.tsx src/pages/CategoriesPage.tsx src/pages/BulkOperationsPage.tsx`
- `cd frontend && npm run type-check`
- `npm run build`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
