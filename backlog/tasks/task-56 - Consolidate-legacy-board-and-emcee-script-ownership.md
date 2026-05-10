---
id: TASK-56
title: Consolidate legacy board and emcee script ownership
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 17:19'
updated_date: '2026-05-10 17:48'
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
- [ ] #1 All currently active emcee-script API surfaces, frontend helpers, and route/navigation entry points are inventoried and classified as canonical, legacy-but-needed, or removable.
- [ ] #2 A single canonical ownership model for emcee scripts is defined and applied consistently across backend routes, frontend API helpers, and UI entry points.
- [ ] #3 Board and organizer users retain the intended script-management capabilities, while emcee users remain consumers of the canonical read-only script workflow.
- [ ] #4 Legacy board-side emcee script paths are removed, redirected, or explicitly retained only where justified, with drift between duplicated surfaces eliminated.
- [ ] #5 The resulting structure is documented clearly enough that future emcee script changes have one obvious integration surface to extend.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the remaining legacy board-side emcee script surface across `boardRoutes`, `boardController`, `BoardService`, frontend API helpers, and any navigation references, and confirm which callers are still active.
2. Remove or redirect the duplicated board-side emcee script CRUD path in favor of the canonical `/emcee/scripts` workflow, keeping board and organizer write access and emcee read-only behavior intact.
3. Update any remaining frontend API helpers or entry points so emcee script integration has one obvious surface to extend, and document the canonical ownership model in the task summary.
4. Add targeted regression coverage where needed, run focused verification, and close the task once the duplicate-surface drift is eliminated.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
