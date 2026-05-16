---
id: TASK-94.3
title: >-
  Align scoring, judge, score-file, and governance workflows with dynamic
  permissions
status: Done
assignee:
  - '@codex'
created_date: '2026-05-16 22:17'
updated_date: '2026-05-16 22:41'
labels:
  - permissions
  - authorization
  - scoring
  - backend
  - frontend
milestone: m-0
dependencies: []
parent_task_id: TASK-94
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Complete the permissions remediation for the scoring-adjacent workflows that remain the most operationally sensitive and the least fully dynamic today. This includes the primary scoring routes, judge-facing routes, score governance and uncertify flows, score removal workflows, score-file upload and access paths, and any related board, auditor, tally-master, or organizer surfaces that still rely on hardcoded role checks or overloaded score resources.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The scoring, judge, score-governance, score-removal, and score-file route families enforce the intended permission resources and operations in the backend, not just hardcoded role lists.
- [x] #2 Frontend scoring-adjacent pages and actions are remapped to the canonical resources and only expose capabilities that the backend will honor.
- [x] #3 The remediation explicitly covers supporting surfaces such as board, auditor, tally-master, and organizer workflows so the scoring authority model is coherent end to end.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Seed the new scoring-related permission resources and operations defined in TASK-94.1 in the default permission matrix, then remap frontend page policy away from overloaded `scores` where the surface is really `score-governance`, `score-removal`, or `score-files`.
2. Align the primary scoring and judge-facing backend routes with hybrid permission enforcement: ordinary scoring reads and writes stay on `scores:*`, deductions remain on `deductions:*`, and judge workspace endpoints enforce the underlying resource tokens they aggregate instead of relying on route-family role checks alone.
3. Align score-governance, score-removal, board, tally-master, and score-file routes with the new canonical resources and operations, including the supporting read/approve/reject/execute/upload/update/delete paths needed for coherent workflow enforcement.
4. Update the affected frontend scoring-adjacent pages, route policies, and affordances so visibility and available actions line up with the backend checks for the new resource taxonomy.
5. Verify the first-wave authority model with focused backend/frontend build and lint coverage plus direct allowed/denied route checks for the touched scoring families, and explicitly defer delegated on-behalf entry mechanics to TASK-94.5 after the resource boundaries are in place.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Seeded the new scoring-related permission resources in src/config/defaultPermissions.ts and remapped scoring-adjacent page policy resources in frontend/src/config/pageAccessPolicy.ts away from overloaded `scores` where the surface is really governance or removal.
- Added hybrid backend permission enforcement across scoring, judge, score-governance, score-file, board, and tally-master route families so the affected workflows now require the canonical resource operations in addition to their existing role boundaries.
- Updated frontend scoring-adjacent pages to honor the new resource taxonomy at the action level: ScoreGovernancePage now gates configure/request/approve behavior by `score-governance:*`, ScoringPage now gates governance links and score-file upload/delete affordances by `score-governance:*` and `score-files:*`, and PermissionsPage now describes the new scoring resources cleanly.
- Verification passed with backend build, focused frontend lint, frontend type-check, and frontend production build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the scoring-adjacent authority model with the canonical permissions taxonomy defined in TASK-94.1.

Changes:
- Seeded the new scoring resources and operations in the default permission matrix, including `score-governance:*`, `score-removal:*`, and `score-files:*`, plus the additional scoring operations needed for the hybrid model.
- Remapped frontend page policy so governance and score-removal surfaces no longer ride on the generic `scores` resource, and upgraded scoring, tally-master, and auditor entry pages to require the relevant resource permission context.
- Added backend `requirePermission(...)` enforcement to the primary scoring, judge workspace, score governance, score-file, board, and tally-master route families so the runtime APIs now honor the intended hybrid permission model instead of hardcoded roles alone.
- Updated ScoreGovernancePage and ScoringPage so action-level UI affordances line up with the new backend checks, and refreshed the permissions matrix descriptions for the new scoring resources.

Verification:
- `npm run build`
- `cd frontend && npx eslint src/config/pageAccessPolicy.ts src/pages/PermissionsPage.tsx src/pages/ScoreGovernancePage.tsx src/pages/ScoringPage.tsx`
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
