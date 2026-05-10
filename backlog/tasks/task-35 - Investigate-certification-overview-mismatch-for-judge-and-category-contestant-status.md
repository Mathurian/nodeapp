---
id: TASK-35
title: >-
  Investigate certification overview mismatch for judge and category/contestant
  status
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 22:59'
updated_date: '2026-05-10 00:05'
labels:
  - certifications
  - bug
  - investigation
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate the certification flow bug shown in temp/bug-ss. The certification overview is not an accurate representation of the current status of judge certifications and category/contestant certification state. The task should identify the source of truth mismatch, determine whether the issue is in aggregation, backend status calculation, or frontend presentation, and capture the concrete fix path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Identify whether the defect originates in backend certification status calculation, overview aggregation, or frontend rendering/state handling.
- [x] #2 Document the exact fix scope needed so a follow-up implementation task can be executed without re-investigating the bug.
- [x] #3 Reproduce or otherwise validate the mismatch shown in temp/bug-ss and document the specific incorrect overview behavior.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Validated the screenshot mismatch in temp/bug-ss: overview cards can show Judges 5/5 while Scores 50/400 submitted, 50 certified, 50 locked, which is internally inconsistent for a fully completed judge stage.
- Frontend is not the source of the defect. frontend/src/components/certifications/CertificationOverviewWorkspace.tsx renders judgeProgress, scoreProgress, and judgeCertified directly from the overview payload and only applies simple display helpers.
- Primary defect source is backend workflow/aggregation divergence. src/utils/certificationPipeline.ts refreshJudgeStage() marks judgeCertified true when every required judge has a judge_certifications row, but it does not verify full score-matrix coverage for assigned judge x contestant x criterion combinations.
- src/controllers/certificationController.ts getCertificationOverview() separately computes scoreProgress total/submitted/certified/locked from score rows and expected combinations, so the overview can show judge-stage completion alongside a partially populated score matrix.
- This mismatch is made visible by judgeCertifiedDerived, which is based only on assigned judges having judge certifications, not on whether the category scoring workload is complete.
- Secondary behavior gap: src/services/ScoringService.ts certifyScores() sets isCertified=true and isLocked=true at judge certification time. That makes the overview's locked count mirror judge-certified rows even though the broader workflow language implies locking is a later-stage concept.
- Legacy tables/routes such as judge_contestant_certifications, review_contestant_certifications, and review_judge_score_certifications do not appear to drive the current overview and are not the primary source of the screenshot bug.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Investigated the certification overview mismatch shown in temp/bug-ss and confirmed the defect is primarily in backend certification-state calculation rather than frontend rendering.

Findings:
- The overview UI renders backend-provided judgeProgress, judgeCertified, and scoreProgress values directly, so the screenshot mismatch is not caused by client-side recomputation.
- refreshJudgeStage() in src/utils/certificationPipeline.ts treats the judge stage as complete when all required judges have judge_certifications records. It does not verify that all expected score entries exist for assigned judge x contestant x criterion coverage.
- getCertificationOverview() in src/controllers/certificationController.ts separately calculates expected score totals and submitted/certified/locked score counts from the scores table. This creates contradictory overview cards where judges appear fully certified while the score matrix is only partially populated.
- The current scoring service also marks rows isLocked=true at judge certification time, which makes the overview's locked metric read as a downstream stage even though it is being set during judge certification.

Concrete fix scope for the follow-up implementation task:
- Introduce a shared backend completeness helper for category score coverage that calculates whether the expected judge x contestant x criterion matrix is fully populated.
- Use that shared helper in both refreshJudgeStage() and getCertificationOverview() so judge-stage completion and overview score totals are derived from the same source of truth.
- Prevent judge-stage completion, or at minimum keep judgeCertified false/incomplete in the overview, when score coverage is not complete even if judge signatures exist.
- Decide whether isLocked should remain a judge-stage effect or move to a later stage; then update the overview labels or workflow behavior so locked reflects the intended certification phase consistently.
- Leave legacy review-certification tables out of the initial fix unless product confirms they are part of the active certification flow.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
