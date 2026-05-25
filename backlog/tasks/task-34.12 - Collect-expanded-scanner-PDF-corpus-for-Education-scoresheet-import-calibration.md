---
id: TASK-34.12
title: >-
  Collect expanded scanner PDF corpus for Education scoresheet import
  calibration
status: Done
assignee:
  - '@codex'
created_date: '2026-05-18 16:39'
updated_date: '2026-05-22 19:06'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expand the supported Education scoresheet calibration corpus using additional scanner-produced PDFs. Use synthetic phone-style/stress variants only to harden quality gates and rejection behavior, not to claim real phone-photo support. Explicitly document that scanner-quality PDF/image uploads are the supported path until representative phone-photo samples exist.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An expanded scanner/PDF corpus is defined and collected for education_saturday_day_v1, including clean and borderline scanner-produced uploads where available.
- [x] #2 Each sample records provenance, page quality notes, represented ground-truth criterion scores, and any known scanner/PDF characteristics that may affect calibration.
- [x] #3 Synthetic stress variants may be generated from scanner pages for rotation, perspective, blur, shadow, contrast, crop, and compression, but are labeled as rejection-gate hardening rather than real phone-photo evidence.
- [x] #4 The sample packet is documented and wired into the existing regression or UAT workflow so reliability work can measure scanner-quality support and unsupported-input rejection separately.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Treat production database access as read-only and avoid persisting credentials in repo files or scripts.
2. Inventory the uploaded mixed-contest PDF packets and render page thumbnails/contact sheets for template/category triage.
3. Query the production database for pending/non-board-approved Education categories and judge-entered score records, joining event, contest, category, contestant, judge, criterion, score, certification, and entry metadata.
4. Match database records to PDF packet/page candidates by judge, category, contestant, and visible page labels; separate Education pages from unsupported/non-Education templates.
5. Produce a scanner-corpus manifest and ground-truth JSON for promoted Education pages, with provenance and quality notes.
6. Wire the manifest into the existing regression/UAT flow only after page matching is defensible; keep unmatched or non-Education pages documented as intake/triage data.
7. Verify with read-only DB checks, JSON/schema validation, and a targeted regression command if corpus wiring changes code.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
User confirmed the uploaded intake PDFs are full contest score-sheet packets across categories/contestants and separated by judge, not Education-only sheets. User also confirmed the authoritative judge-entered scores for Education are in the production PostgreSQL database and Education is pending Board approval, so DB values should be treated as judge-entered import ground truth rather than final board-approved results.

- Rendered all 150 uploaded scanner pages from the five judge PDFs into temporary triage images and contact sheets under temp/scoresheet-corpus-intake/.
- Classified Education pages order-independently from contact sheets: pages 1-6 in each judge packet, with contestant order varying by packet.
- Queried production PostgreSQL read-only for Pet / Education category cmn6qqg6y1mwc10vex0fj7ku1 and exported 30 judge-entered scanner samples / 300 criterion scores.
- Created tests/examples/scoresheet-import/route66-2026-pet-education-scanner-ground-truth.json with source PDF provenance, DB trace IDs, quality notes, board/totals status, and per-criterion score ground truth.
- Updated scripts/ops/score-sheet-import-regression.js so an alternate --ground-truth file and per-sample sourcePdf can be used without changing the default calibration file.
- Ran expanded scanner calibration against the new 30-page corpus. Result failed: standard normalized image was 44.3% exact row match with 44 false high-confidence marks; best exact-row variant was scan_bw_fixed_190 at 53.7% but with 87 false high-confidence marks, so scan-BW should not be adopted as a reliability improvement.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Expanded TASK-34.12 from a handset-photo corpus into a scanner/PDF corpus backed by production judge-entered scores.

Changes:
- Added a 30-page Pet / Education scanner ground-truth JSON covering five judge packets and six contestants, sourced from read-only production score records while Education is pending Board approval.
- Updated the scoresheet regression harness to accept --ground-truth and per-sample sourcePdf values so mixed source PDFs can be evaluated without relying on page order.
- Documented the intake packet, Education page maps, DB ground-truth source, generated triage artifacts, and first expanded-corpus regression result in temp/scoresheet-corpus-intake/README.md.

Verification:
- jq empty tests/examples/scoresheet-import/route66-2026-pet-education-scanner-ground-truth.json
- node --check scripts/ops/score-sheet-import-regression.js
- node scripts/ops/score-sheet-import-regression.js --mode=calibration --ground-truth=tests/examples/scoresheet-import/route66-2026-pet-education-scanner-ground-truth.json (expected calibration failure; establishes baseline)
- git diff --check

Result:
The expanded corpus is wired and usable for TASK-34.15. The current extractor is not reliable on this scanner corpus: standard extraction reached 44.3% exact row match and the best scan-BW exact-row variant increased false high-confidence wrong marks.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
