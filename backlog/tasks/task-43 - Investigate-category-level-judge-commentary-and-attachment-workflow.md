---
id: TASK-43
title: Investigate category-level judge commentary and attachment workflow
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 02:48'
updated_date: '2026-05-10 04:05'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate whether judge comments and commentary attachments should be captured at the category level instead of per criterion for scoring workflows with multiple criteria under a category, such as Education, Formal Wear, and similar sections. Evaluate the current per-criterion UX and data model, determine whether category-level commentary better matches judging practice, and assess whether organizers should be able to choose per-category commentary, per-criterion commentary, or both through configuration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The investigation documents the current per-criterion commentary and upload behavior in scoring flows and identifies the main usability or workflow issues it creates for judges.
- [x] #2 The task defines at least one viable implementation approach for category-level commentary and attachments, including required backend, frontend, migration, and reporting impacts.
- [x] #3 The investigation evaluates whether organizers should be able to choose per-criterion, per-category, or hybrid commentary behavior and documents the recommended product decision and configuration approach.
- [x] #4 If feasible within scope, a standards-compliant implementation is delivered or a clearly scoped follow-up implementation plan is recorded with risks, constraints, and dependencies.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Document the current state: per-criterion text comments live on score rows, commentary APIs still require score and criterion context, category-level attachments already exist, and the existing `JudgeComment` category+contestant+judge model is currently unused in the active scoring flow.
2. Define the recommended product shape: add an explicit commentary mode configuration at the category level (`PER_CRITERION`, `PER_CATEGORY`, `HYBRID`) and use `JudgeComment` as the canonical store for category-level text while preserving existing score-row comments for per-criterion mode.
3. If the implementation scope stays contained, add the backend/frontend path for category-level commentary and hybrid support: category config, scoring UI branching, category-level read/write endpoints, and reporting/read-model updates.
4. Add focused regression coverage and record any follow-up constraints if full reporting/export parity cannot ship in the same change.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added Prisma `CommentaryMode` enum plus category/category-template fields with migration `20260510012000_add_commentary_mode_to_categories_and_templates`.
- Extended category CRUD, clone, category template, and event template flows so `commentaryMode` persists across create, update, clone, template export, and template-based category creation.
- Added category-level commentary endpoints on `/commentary/category/:categoryId/contestant/:contestantId`, backed by `JudgeComment`, with judge-context validation and category-level attachment context support in `scoreFileController`.
- Updated `ScoringPage` to branch between per-criterion, per-category, and hybrid commentary UI; category-level commentary now saves through the new endpoint and top-level attachments upload as `CATEGORY` context.
- Added regression coverage in `tests/unit/services/CommentaryService.test.ts` and `tests/unit/controllers/commentaryController.test.ts`; verification passed with `npx prisma generate`, focused Jest, backend build, frontend type-check, and frontend build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented configurable category commentary modes across backend and frontend scoring flows.

Changes:
- Added `PER_CRITERION`, `PER_CATEGORY`, and `HYBRID` commentary modes to `Category` and `CategoryTemplate`, with migration support and Prisma client regeneration.
- Preserved the mode across category CRUD, cross-event category cloning, category-template creation, event-template serialization, and template-based category creation so commentary configuration no longer drops during structure-copy workflows.
- Added category-level judge commentary endpoints backed by `JudgeComment` and updated score-file uploads so top-level commentary attachments are explicitly stored as category-context attachments.
- Updated the scoring UI to render the correct commentary experience per category: per-criterion comments, a single category-level comment, or both.
- Added focused service/controller tests for category commentary retrieval and upsert behavior.

Verification:
- `npx prisma generate`
- `npx jest tests/unit/services/CommentaryService.test.ts tests/unit/controllers/commentaryController.test.ts --runInBand`
- `npm run build`
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
