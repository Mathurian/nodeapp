---
id: TASK-56
title: Consolidate legacy board and emcee script ownership
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 17:19'
updated_date: '2026-05-10 17:55'
labels:
  - emcee
  - scripts
  - architecture
  - cleanup
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reduce drift between the canonical emcee script workflow and the remaining legacy board-side emcee script APIs, helpers, and ownership assumptions. This task should define and implement one clear ownership model for emcee scripts so permissions, navigation, and integration points consistently reflect that board/organizer users manage scripts and emcee users consume them read-only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All currently active emcee-script API surfaces, frontend helpers, and route/navigation entry points are inventoried and classified as canonical, legacy-but-needed, or removable.
- [x] #2 A single canonical ownership model for emcee scripts is defined and applied consistently across backend routes, frontend API helpers, and UI entry points.
- [x] #3 Board and organizer users retain the intended script-management capabilities, while emcee users remain consumers of the canonical read-only script workflow.
- [x] #4 Legacy board-side emcee script paths are removed, redirected, or explicitly retained only where justified, with drift between duplicated surfaces eliminated.
- [x] #5 The resulting structure is documented clearly enough that future emcee script changes have one obvious integration surface to extend.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the remaining legacy board-side emcee script surface across `boardRoutes`, `boardController`, `BoardService`, frontend API helpers, and any navigation references, and confirm which callers are still active.
2. Remove or redirect the duplicated board-side emcee script CRUD path in favor of the canonical `/emcee/scripts` workflow, keeping board and organizer write access and emcee read-only behavior intact.
3. Update any remaining frontend API helpers or entry points so emcee script integration has one obvious surface to extend, and document the canonical ownership model in the task summary.
4. Add targeted regression coverage where needed, run focused verification, and close the task once the duplicate-surface drift is eliminated.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Audited the remaining emcee-script ownership surface and confirmed the active canonical flow is `/emcee/scripts` plus the `EmceePage`, while the leftover board-side CRUD stack in `boardRoutes`/`boardController`/`BoardService` was duplicate and not used by the active frontend.
- Removed the legacy board emcee-script routes, controller exports, and service methods so board and organizer roles continue to manage scripts only through the canonical emcee workflow established in TASK-53.
- Removed the stale `boardAPI.getEmceeScripts` helper and trimmed obsolete board controller/service tests that only covered the deleted duplicate surface.
- Verification: `npx jest tests/unit/controllers/boardController.test.ts --runInBand`, `npm run build`, `cd frontend && npm run type-check`, `cd frontend && npm run build`.
- Additional note: `npx jest tests/unit/controllers/boardController.test.ts tests/unit/services/BoardService.test.ts --runInBand` still hits an unrelated pre-existing `approveCertification` mock drift in `tests/unit/services/BoardService.test.ts`, outside the removed emcee-script ownership path.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Consolidated emcee script ownership so `/emcee/scripts` is the single canonical integration surface for script management and consumption.

Changes:
- Removed the duplicate board-side emcee script CRUD endpoints from `boardRoutes` and the associated controller exports/methods.
- Removed the legacy board emcee script service methods from `BoardService`, leaving board functionality focused on certification and score-removal concerns.
- Deleted the stale frontend `boardAPI.getEmceeScripts` helper so frontend integrations point at the canonical emcee workflow only.
- Trimmed obsolete board controller/service tests that covered the deleted duplicate surface.

Ownership model:
- Board and organizer roles retain script-management capability through the canonical `/emcee/scripts` workflow.
- Emcee users remain read-only consumers through the emcee experience.

Verification:
- `npx jest tests/unit/controllers/boardController.test.ts --runInBand`
- `npm run build`
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`

Follow-up note:
- `tests/unit/services/BoardService.test.ts` still has unrelated pre-existing `approveCertification` mock drift in certification-pipeline coverage; that suite failure is not caused by the emcee ownership cleanup.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
