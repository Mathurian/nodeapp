---
id: TASK-34.5
title: Validate OCR accuracy thresholds and finalize rollout decision
status: Done
assignee:
  - '@codex'
created_date: '2026-05-17 06:12'
updated_date: '2026-05-17 19:34'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate the implemented OCR flow against representative scoresheet samples to determine whether it is reliable enough for production use or whether delegated entry should remain the primary fallback.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 OCR accuracy is evaluated against representative handwritten and photo-captured scoresheet samples using documented criteria.
- [x] #2 Confidence thresholds or review rules are defined for low-confidence or ambiguous extractions.
- [x] #3 A go or no-go recommendation is documented for production rollout, including any remaining limitations or a decision to prefer delegated entry as the operational fallback.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Establish a measurable baseline from the provided sample scoresheet packet by comparing the current extracted criterion scores against manually readable ground truth on representative pages.
2. Tune the template alignment and mark-detection rules using that baseline until we understand the realistic ceiling for the Phase 1 self-hosted scores-only approach.
3. Define practical review thresholds and fallback rules for low-confidence, ambiguous, or mismatched extractions based on real sample behavior rather than theoretical confidence scores.
4. Document a go or no-go rollout recommendation that explicitly compares this Phase 1 import path against delegated entry as the operational fallback if accuracy remains too weak.
5. Record the measured limitations, recommended safeguards, and any additional sample-data needs required before production rollout.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Evaluated the implemented scoresheet-import pipeline against the provided handwritten sample packet and recorded the measured baseline in docs/operations/OCR-SCORESHEET-CALIBRATION-ROLLOUT-DECISION.md.
- The current detector produced materially wrong results on the shared Education sheet family, including totals of 1 against visible paper totals of 48 and 58, plus repeated false-positive row matches.
- Defined strict review rules for low-confidence and ambiguous drafts, but the current baseline would still force near-total manual review.
- No dedicated phone-photo sample packet was available for this pass; that limitation is documented as a prerequisite before any future rollout reconsideration.
- Final recommendation for this task is no-go for production rollout now; delegated entry remains the primary operational fallback.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Documented the Phase 1 scoresheet-import calibration baseline and finalized the rollout decision for TASK-34.5.

What changed:
- Added docs/operations/OCR-SCORESHEET-CALIBRATION-ROLLOUT-DECISION.md with measured baseline results, failure analysis, review-threshold guidance, and a production no-go recommendation.
- Captured that the current template-first detector is architecturally correct but materially inaccurate on the provided sample packet, including high-confidence false positives and severe total mismatches.
- Recorded the operational recommendation to keep delegated entry as the real fallback while scoresheet import remains internal or experimental.

Limitations and follow-up:
- A dedicated phone-photo sample set was not available for this pass, so future reconsideration still requires broader template-family calibration on both scans and photos.
- Handwritten comments remain deferred to TASK-95 and are not part of this Phase 1 decision.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
