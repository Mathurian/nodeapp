---
id: TASK-39
title: Fix certification overview judge and score status mismatch
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 00:06'
updated_date: '2026-05-10 00:18'
labels:
  - certifications
  - bug
  - backend
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the production fix from TASK-35 so the certification overview reflects a single backend source of truth for judge-stage completion and category score completeness. The fix should eliminate contradictory states such as fully certified judges alongside incomplete expected score coverage, and it should resolve misleading score-lock presentation if the current workflow semantics are inconsistent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Judge-stage completion in the certification workflow is derived from the same score-completeness rules used by the certification overview.
- [x] #2 Certification overview cards no longer report judges/category status as complete when expected judge x contestant x criterion score coverage is incomplete.
- [x] #3 The overview's submitted/certified/locked counts and labels accurately reflect the intended certification stage behavior after the backend fix.
- [x] #4 Focused regression coverage is added for the inconsistent state identified in TASK-35.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a shared certification score-coverage helper that calculates expected judge x contestant x criterion combinations plus submitted/certified/locked coverage from category assignments, contestants, criteria, and score rows.
2. Update refreshJudgeStage() to use that helper so judge-stage completion only becomes true when all required judges have signed and the category score coverage is complete under the same rules used by the overview.
3. Update getCertificationOverview() to use the same helper instead of its local score aggregation so the overview cannot contradict workflow state.
4. Add focused regression coverage for the contradictory state found in TASK-35 and run targeted backend tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added a shared calculateCategoryScoreCoverage() helper in src/utils/certificationPipeline.ts to compute expected judge x contestant x criterion coverage plus submitted/certified/locked counts from the same inputs used by workflow state.
- Updated refreshJudgeStage() so judge-stage completion now requires both judge signature coverage and full score-matrix coverage for each required judge. This prevents signed-but-incomplete categories from advancing the judge stage.
- Updated getCertificationOverview() to use the same shared helper and to treat a judge as complete only when that judge has signed and completed expected score coverage. The overview no longer reports contradictory judge completion against partial score totals.
- Added focused regression coverage in tests/unit/controllers/certificationController.test.ts for the production mismatch and direct helper coverage in tests/unit/utils/certificationPipeline.test.ts.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
