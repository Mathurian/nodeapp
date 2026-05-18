---
id: TASK-34.10
title: >-
  Validate first supported scoresheet template family in UAT and finalize Phase
  1 rollout decision
status: Done
assignee:
  - '@codex'
created_date: '2026-05-17 19:43'
updated_date: '2026-05-17 21:46'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use the calibrated extractor and regression harness to validate whether the first supported scoresheet template family is reliable enough to ship. This task should include UAT on realistic uploads, documented supported and unsupported capture conditions, and a final release recommendation grounded in measured accuracy and review burden.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The first intended Phase 1 scoresheet template family is validated in UAT using realistic uploads, including at least representative scans and phone-photo captures.
- [x] #2 Supported and unsupported capture conditions are documented clearly enough for operators and judges to know when scoresheet import should and should not be used.
- [x] #3 A final rollout recommendation is documented for the first supported template family based on measured accuracy, review burden, and comparison with delegated entry as the fallback.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added a repeatable UAT harness at scripts/ops/score-sheet-import-uat.js and npm run test:scoresheet-import:uat to evaluate clean scans and representative phone-style upload variants for the Education family.
- Measured UAT results remained below rollout quality: clean scans stayed at 50.0% exact row match with 5.00 incorrect rows/page on average; synthetic phone-style variants landed between 46.7% and 53.3% exact row match with 4.67-5.33 incorrect rows/page.
- Documented the final no-go recommendation, supported vs unsupported usage conditions, and the comparison showing OCR review burden still loses to delegated entry operationally.
- Noted the remaining blockers explicitly: no real handset-photo corpus yet, reliability too low, and TASK-34.11 still needed for template versioning/recalibration workflow.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Validated the Education scoresheet-import family in UAT using the shared six-page scan set plus repeatable synthetic phone-style upload variants. Added a dedicated UAT harness at scripts/ops/score-sheet-import-uat.js, wired it into package.json, and documented the measured results in docs/operations/OCR-SCORESHEET-UAT-EDUCATION.md.

Outcome:
- Clean scans remain at 50.0% exact row match with about 5 corrected rows required per page.
- Synthetic phone-style variants remain in the same unreliable range and do not produce an operational labor win over delegated entry.
- Final recommendation is No-Go for production rollout of education_saturday_day_v1; delegated entry remains the real fallback.

Documentation updates:
- Added the Education-family UAT decision doc.
- Updated the calibration baseline, reliability policy, and sample-corpus docs to point to the final UAT status and the remaining blocker set.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
