---
id: TASK-34.40
title: Harden v3 fiducial and page normalization for phone captures
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-26 04:12'
updated_date: '2026-05-26 16:50'
labels:
  - scoring
  - ocr
  - uat
  - calibration
dependencies:
  - TASK-34.39
  - TASK-34.33
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve v3 phone-photo page normalization after diagnostic overlays identify the current failure modes. The goal is to make the same printed sheet normalize consistently across skew, lighting, partial background, and handheld capture variations before mark scoring is tuned.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The parser consistently selects the real four v3 page fiducials instead of nearby dark noise or version-strip elements on the IMG_5152.jpeg through IMG_5159.jpeg corpus.
- [ ] #2 Normalization handles rotated, skewed, off-axis, and unevenly lit phone captures without relying on a single global threshold variant.
- [x] #3 Failure metadata reports which normalization stage failed when a capture cannot be confidently warped.
- [ ] #4 Regression coverage protects the original v3 setup image, IMG_5152.jpeg through IMG_5159.jpeg, and existing scanner/synthetic calibration samples from fiducial-detection regressions.
- [x] #5 The rollout gate remains conservative: captures with uncertain page geometry are rejected rather than producing high-confidence score rows.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Use the 34.39 overlays/JSON as the baseline and treat low canonical version-strip confidence as a geometry warning, not a mark-scoring problem.
2. Replace the current greedy per-quadrant fiducial choice with a scored quadrilateral selection: gather plausible candidates, rank quadrant candidates, evaluate candidate corner sets by page geometry, then validate the best sets by warping and reading the v3 version strip.
3. Keep normalization conservative by rejecting uncertain fiducial geometry instead of allowing rows to score from a suspect warp. Preserve preprocessing modes, but avoid requiring one hardcoded threshold to succeed.
4. Add regression coverage for synthetic v3 sheets plus a false-corner/inner-candidate case that reproduces the IMG_5152 failure mode.
5. Regenerate diagnostics for IMG_5152.jpeg through IMG_5159.jpeg, compare fiducial/version-strip warnings before and after, and update the task with whether geometry is now stable enough for 34.41 mark scoring.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Implemented scored multi-candidate v3 fiducial selection with low-threshold/template candidates, projected bottom-corner candidates, version-strip validation against renderer coordinates, and canonical-anchor confidence gating.
- Added focused regression coverage for v3 diagnostic extraction and false dark corner candidates.
- Standard-mode corpus result after changes: IMG_5152, IMG_5154, and IMG_5155 accept page geometry with zero geometry warnings and then fail conservatively at mark scoring; IMG_5153, IMG_5156, IMG_5157, IMG_5158, and IMG_5159 still reject as geometry. IMG_5158 is extremely low light; IMG_5153 has cropped/edge anchors; IMG_5156/5159 remain rotation/off-axis failures.
- Because only 3/8 phone photos accept geometry, AC #1, #2, and #4 remain incomplete. Next work should add page-polygon/rotation normalization or a capture-quality rejection classifier before mark scoring calibration.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
