---
id: TASK-47
title: 'Add category, contest, and event scoped commentary resolution'
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 04:57'
updated_date: '2026-05-14 04:47'
labels: []
dependencies: []
priority: high
ordinal: 10013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expand shared judge commentary beyond category-only storage so the platform can support commentary that is scoped by category, contest, or event while preserving current category-scoped behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Admins and organizers can configure the shared judge commentary scope to resolve at category, contest, or event level without breaking existing category-level scoring flows.
- [x] #2 When commentary scope is set to contest or event, judges see and edit one shared commentary record per contestant for that effective scope while criterion-level score comments remain category-specific.
- [x] #3 Existing category-scoped commentary continues to work, and backend validation/reporting reads and writes commentary against the correct effective scope.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add explicit shared commentary scope support in the data model so judge commentary can resolve by category, contest, or event while preserving current category records.
2. Update backend commentary services/controllers and effective-scope resolution so reads and writes target the correct scoped record for each category context.
3. Extend admin category/contest/event configuration and judge scoring UI so staff can choose the shared commentary scope and judges see the correct shared comment behavior.
4. Add focused coverage for scope resolution and run backend/frontend verification before deployment.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added a new CommentaryScope model layer for shared judge commentary and updated JudgeComment storage so records can resolve by category, contest, or event scope.
- Extended category and category-template configuration plus copy/template deployment flows to carry commentaryScope alongside commentaryMode.
- Updated scoring commentary read/write behavior so the shared non-criterion comment follows the effective category-configured scope, while criterion comments remain category-specific.
- Added focused validation and commentary service regression coverage for category, contest, and event scope resolution.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented scoped shared commentary resolution so judge category commentary can be shared per category, contest, or event while preserving criterion-specific score comments.

Changes:
- Added CommentaryScope support to categories and category templates, plus a scoped JudgeComment storage model that resolves commentary records by scope key rather than category-only identity.
- Updated commentary service resolution so the existing category commentary endpoint now reads and writes against the effective category-configured scope.
- Extended category and event-template admin UI to configure commentary scope, and updated the scoring UI to show shared contest/event commentary labels and cache keys correctly.
- Preserved criterion-level commentary as category-specific by design; the new scope applies to the shared non-criterion judge comment field.

Verification:
- npx prisma generate
- npx jest tests/unit/services/CommentaryService.test.ts tests/unit/middleware/validation.test.ts --runInBand
- npm run build
- cd frontend && npm run type-check
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
