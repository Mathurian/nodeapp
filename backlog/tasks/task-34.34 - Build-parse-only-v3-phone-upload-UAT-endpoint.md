---
id: TASK-34.34
title: Build parse-only v3 phone upload UAT endpoint
status: Done
assignee:
  - '@codex'
created_date: '2026-05-25 23:46'
updated_date: '2026-05-26 01:46'
labels:
  - scoring
  - ocr
  - backend
  - uat
dependencies:
  - TASK-34.33
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a backend UAT path for real phone-photo uploads that runs the v3 parser and compares the result to existing stored scores without creating drafts, modifying scores, changing certification state, or bypassing certified category locks. This lets certified Education scores serve as ground truth while keeping production scoring data immutable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Authorized users can upload a scoresheet image with event, contest, category, judge, and contestant context to a parse-only UAT endpoint.
- [x] #2 The endpoint accepts JPEG/PNG plus HEIC/HEIF via server-side conversion before normalization, and returns clear errors for unsupported or failed conversions.
- [x] #3 The endpoint initially enables only the explicit education_omr_v3 parser and does not infer or enable unsupported categories.
- [x] #4 Certified or locked categories can be evaluated in parse-only mode, but the endpoint never creates ScoreFile records, score import drafts, score records, certifications, approval changes, or audit entries that imply score mutation.
- [x] #5 The response includes extracted rows, computed total, comparison to stored judge scores when available, exact-row count, total delta, rejected rows, false high-confidence marks, anchor quality, mark quality, quality-gate decision, and retry/manual-entry routing recommendation.
- [x] #6 Automated tests prove the endpoint is non-mutating and that upload conversion plus v3 parsing returns the expected UAT response shape.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a parse-only public method to ScoreSheetImportService that accepts an uploaded image buffer plus tenant/category/judge/contestant context, validates the category/template as explicit education_omr_v3 only, converts supported image formats as needed, normalizes/extracts scores, and compares rows to stored scores without writing database records.
2. Add response shaping for UAT metrics: extracted rows, expected stored scores, exact-row count, totals, total delta, rejected rows, false high-confidence marks, anchor/mark quality, quality gate, and retry/manual-entry recommendation.
3. Add a memory-backed multer route under score file routes, before parameterized routes, for POST /score-files/scoresheet-import-uat using existing role/permission checks and ScoreDelegationService judge-context resolution.
4. Keep certified/locked categories evaluation-only by design: allow read/compare on certified contexts but do not call ScoreFileService, draft creation, score writes, certification writes, idempotency writes, or score mutation audit actions.
5. Add targeted unit coverage for the parse-only service method and route/controller behavior: success shape, unsupported template/category rejection, conversion failure path, missing file/context validation, and non-mutating Prisma mocks.
6. Run TypeScript build plus focused ScoreSheetImportService/score-file route-controller tests, then update task AC/DoD/final summary with evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added a parse-only ScoreSheetImportService UAT method that validates event/contest/category/judge/contestant context, accepts explicit education_omr_v3 only, converts HEIC/HEIF to JPEG when supported, runs v3 extraction from an in-memory upload, and compares rows to stored scores.
- Added POST /score-files/scoresheet-import-uat with memory-backed multer and existing score-file process permissions; the route does not persist ScoreFile records or create import drafts.
- Added service/controller tests for success, missing-file validation, unsupported template rejection, HEIC conversion failure messaging, and non-mutating behavior.
- Verification passed: npx tsc --noEmit, focused Jest suites, npm run build, and git diff --check.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the backend parse-only v3 phone upload UAT endpoint.

Changes:
- Added ScoreSheetImportService.evaluateScoresheetImportUat for in-memory image evaluation, explicit education_omr_v3 gating, HEIC/HEIF conversion handling, v3 parser execution, stored-score comparison, and non-mutating UAT metrics.
- Added POST /score-files/scoresheet-import-uat using memory-backed multer, existing auth/permission checks, and acting judge context resolution.
- Returned context, certification/lock state, extracted rows, expected stored scores, exact-row metrics, total delta, rejected rows, false high-confidence marks, anchor/mark quality, quality gate, and evaluation-only routing guidance.
- Added focused service and controller coverage proving non-mutating behavior, endpoint handoff, unsupported template rejection, missing file handling, and HEIC conversion failure messaging.

Tests:
- npx tsc --noEmit
- npx jest tests/unit/services/ScoreSheetImportService.test.ts tests/unit/controllers/scoreFileController.test.ts --runInBand
- npm run build
- git diff --check
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
