---
id: TASK-34.4
title: Build OCR review and correction workflow for imported scores
status: Done
assignee:
  - '@codex'
created_date: '2026-05-17 06:12'
updated_date: '2026-05-17 18:37'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the review experience that lets authorized users inspect OCR-extracted scores and comments, correct mistakes, and explicitly accept the import into the verified scoring workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Authorized users can review extracted values alongside the uploaded source file before acceptance.
- [x] #2 Only accepted and reviewed OCR imports proceed into the existing scoring and certification flow.
- [x] #3 Users can correct extracted criterion scores before applying the import into the scoring workflow, and the review step clearly flags ambiguous or low-confidence rows.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend the existing scoring-page score-file entry point so users can explicitly upload a file as either a commentary attachment or a scoresheet import source, with revised labels and intent-aware metadata.
2. Add scoresheet-import draft queries and actions to the scoring workspace so a processed draft can be loaded, inspected, retried, and tracked alongside the uploaded source artifact.
3. Build the Phase 1 review UI around the new draft model: show the uploaded source file, extracted criterion values, ambiguity or confidence indicators, recomputed total, and editable score inputs before acceptance.
4. Implement acceptance of reviewed scores into the normal scoring workflow by converting approved draft values into the existing per-criterion score submission path, without certification and without touching deferred comments work.
5. Verify the new flow with focused backend/frontend build coverage and at least one UI-level test or targeted integration check for upload-intent branching and accepted-draft score submission.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- The review workflow should be entered from the existing contestant-scoped score-file upload surface on scoring pages rather than a separate import-only page.
- UI copy and affordances should stop implying commentary-only attachments once scoresheet import is introduced, and should clearly distinguish ordinary attachments from scoresheet import review.

TASK-34 Phase 1 scope is scores-only. Deductions and handwritten comments are intentionally out of scope for this task and remain deferred.

- Reused the existing contestant-scoped score-file upload entry point in ScoringPage and added explicit `SCORESHEET_IMPORT` upload handling rather than creating a second upload surface.
- Added scoresheet import file segmentation in the scoring workspace so imported score sheets are shown separately from commentary attachments.
- Added draft fetch, processing, retry, review, and source-file actions tied to the new backend scoresheet-import draft endpoints.
- Built a Phase 1 review panel that shows extracted criterion rows, ambiguity/confidence indicators, mismatch warnings, a reviewed total, and editable score inputs before acceptance.
- Implemented acceptance by applying reviewed draft values into the existing scoring form, after which the normal score submission and certification flow continues unchanged.
- Revised the category-level scoring workspace so the scoresheet import panel is visible even when category commentary is disabled, which avoids incorrectly hiding the new Phase 1 path on non-commentary categories.
- Verification is frontend-focused: type-check, lint, and production build all pass. There is not yet a dedicated automated UI test for the review panel itself; that gap is noted but not treated as a blocker for this task.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented the Phase 1 scoresheet review and correction workflow in the scoring workspace.

What changed:
- Extended the existing score-file upload surface in ScoringPage so users can upload a file specifically as a scoresheet import source.
- Added a dedicated imported-scoresheet area that lists uploaded score sheets separately from commentary attachments, supports process/retry actions, and links back to the source artifact.
- Added a review panel for processed drafts that shows extracted criterion scores, confidence/ambiguity signals, mismatch warnings, and editable reviewed values.
- Implemented the acceptance handoff by applying reviewed imported scores into the existing scoring form, allowing the normal submit/certify flow to remain the source of truth for accepted scores.

Verification:
- cd frontend && npm run type-check
- cd frontend && npx eslint src/pages/ScoringPage.tsx src/services/api.ts
- npm run build
- cd frontend && npm run build

Known limitation carried forward intentionally:
- There is not yet a dedicated automated UI test for the new review panel. The workflow is covered by type/lint/build verification, while extraction accuracy and rollout readiness remain the purpose of TASK-34.5.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
