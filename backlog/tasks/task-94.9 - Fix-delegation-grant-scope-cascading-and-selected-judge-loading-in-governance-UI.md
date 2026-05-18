---
id: TASK-94.9
title: >-
  Fix delegation grant scope cascading and selected-judge loading in governance
  UI
status: Done
assignee:
  - '@codex'
created_date: '2026-05-18 19:05'
updated_date: '2026-05-18 19:13'
labels: []
dependencies: []
parent_task_id: TASK-94
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Correct the score-governance delegation grant form so contest and category scopes use event-to-contest-to-category cascading selectors and selected judges load from the scoped assignment set instead of a broken global judge list.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Contest-scoped delegation grants require event selection before contest selection, and category-scoped grants require event and contest selection before category selection.
- [x] #2 Selected judges load from the current delegation scope and are limited to judges assigned within that scope.
- [x] #3 The score-governance delegation grant form builds, type-checks, and no longer shows an empty or non-functional selected-judge list for valid scoped selections.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Identified two UAT issues in ScoreGovernancePage: contest/category delegation scopes did not use cascading event/contest/category selectors, and selected judges were sourced from /assignments/judges via array extraction that did not match the API payload.
- Reworked the delegation grant form to require upstream scope selection, query contests by event, query categories by contest, and derive represented judges from scoped assignment rows instead of the broken global judge feed.
- Verified with frontend eslint, type-check, and build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed the score-governance delegation grant form so scope selection now follows the expected event -> contest -> category cascade and selected judges are loaded from the scoped assignment set instead of a broken global judge feed.

Changes:
- Updated the frontend assignments API helper to support filtered assignment queries.
- Reworked the ScoreGovernancePage delegation grant form to require upstream scope selection for contest/category grants and to reset narrower selections when scope changes.
- Replaced the selected-judges source with scoped assignment rows, deduped to assigned judges in the current scope, and added empty-state guidance when no eligible judges exist.
- Deployed the UI fix to production as release 20260518141104.

Verification:
- cd frontend && npx eslint src/pages/ScoreGovernancePage.tsx src/services/api.ts
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
