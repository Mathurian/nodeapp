---
id: TASK-34.18
title: Benchmark free and self-hosted current-sheet extraction options
status: Done
assignee:
  - '@codex'
created_date: '2026-05-21 20:40'
updated_date: '2026-05-21 22:22'
labels:
  - scoring
  - ocr
  - backend
  - research
dependencies: []
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate whether free or self-hosted extraction options can preserve the current Education scoresheet format while materially improving import accuracy before making paper-form changes. Compare improved deterministic local OMR, CPU-local mark classification, and self-hosted or free OCR/layout tools against the existing calibration corpus and any available small additional samples.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The benchmark compares the current extractor against improved local OMR, CPU-feasible local mark classification, and at least one free or self-hosted OCR/layout candidate without requiring scoresheet form changes.
- [x] #2 The benchmark reports exact row match, exact sheet match, incorrect rows per page, ambiguous rows per page, false high-confidence marks, rejection rate, runtime, hosting requirements, and operational risks.
- [x] #3 The recommendation identifies the best primary extraction path and whether any free hosted fallback is accurate enough to consider behind tenant opt-in controls.
- [x] #4 Paid cloud services are excluded from the recommended production path.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Establish the current baseline by running the existing calibration/UAT harness and saving the metrics needed for comparison: exact row match, exact sheet match, incorrect rows/page, ambiguous rows/page, false high-confidence marks, rejection rate, and runtime. 2. Build a benchmark harness around the existing Education ground-truth corpus that can run multiple extractor candidates without changing the paper form or production import path. 3. Add and evaluate an improved deterministic local OMR candidate using existing local tooling first: stronger grid registration, cell cropping, printed-line suppression, morphology/connected-component mark scoring, and conservative rejection gates. 4. Evaluate CPU-feasible local mark-classification feasibility using cropped score-cell fixtures; if the corpus is too small for training, document the data gap and use simple holdout-style scoring only where defensible. 5. Attempt at least one free/self-hosted OCR or document-layout candidate in an isolated benchmark path, preferring PaddleOCR/PP-Structure, Surya, or docTR based on install feasibility and CPU practicality; if package/network/runtime constraints block execution, record the blocker and compare hosting requirements from primary documentation. 6. Produce a recommendation document and backlog summary identifying the best primary extractor, whether any free hosted fallback is accurate enough for tenant opt-in, and whether paid cloud remains excluded.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Started TASK-34.18 and reviewed existing UAT/calibration docs plus the regression harness. Current baseline is known to be no-go: clean scans around 50% exact row match with roughly 5 incorrect rows/page.

Checked runtime availability: Node 20, Python 3.12, Sharp, and pdftoppm are available; OpenCV/PaddleOCR/Surya/docTR/scikit-image/Tesseract are not currently installed in the environment.

Reviewed primary project documentation for OpenCV homography/form alignment, PaddleOCR/PP-Structure, Surya, and docTR to shape the candidate benchmark set.

Implemented a repeatable benchmark harness at scripts/ops/score-sheet-import-extractor-benchmark.js and added npm run test:scoresheet-import:benchmark. The harness compares the current extractor, fixed-template local OMR, connected-component OMR, and a leave-one-page-out CPU mark-classifier proxy. It also records availability/hosting-risk blockers for Tesseract, PaddleOCR/PP-Structure, Surya, and docTR.

Benchmark result on the six-page Education corpus: current extractor remains best at 50.0% exact row match, 0/6 exact sheets, 5.00 incorrect rows/page, 12 false high-confidence marks. Fixed-template and component OMR variants were worse. The CPU classifier proxy was also worse and the corpus is too small for production training.

Recommendation documented in docs/operations/OCR-SCORESHEET-SELF-HOSTED-BENCHMARK.md: do not enable auto-submit or auto-certification, do not enable tenant opt-in free OCR fallback yet, and do not promote TASK-34.19 into production implementation without stronger registration/classification and a larger representative corpus.

Reopened after review: the task did not empirically evaluate external self-hosted OCR/layout tools because Tesseract, PaddleOCR/PP-Structure, Surya, and docTR were not installed in the environment. The prior work should be treated as a local no-new-dependency benchmark plus an external-tool feasibility screen, not a complete self-hosted contender evaluation. A follow-up task will install and run the top self-hosted contenders before this effort can be considered complete.

- Follow-up TASK-34.25 completed the missing installed-tool evaluation. Tesseract and docTR were run against the Education corpus; PaddleOCR/PP-Structure and Surya were blocked with concrete runtime reasons.
- Installed contender results were added to docs/operations/OCR-SCORESHEET-SELF-HOSTED-BENCHMARK.md and temp/scoresheet-selfhosted-benchmark/benchmark-report.json.
- The reopened acceptance gap is resolved: no evaluated free/self-hosted contender materially improves the current-sheet import path or justifies tenant opt-in fallback, auto-submit, auto-certification, or removing review/correction.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a backend-only benchmark harness for current-sheet scoresheet extraction options.

Changes:
- Added scripts/ops/score-sheet-import-extractor-benchmark.js to compare the current production extractor, fixed-template local OMR, connected-component local OMR, and a leave-one-page-out CPU mark-classifier proxy.
- Added npm run test:scoresheet-import:benchmark for repeatable benchmark execution after build.
- Added docs/operations/OCR-SCORESHEET-SELF-HOSTED-BENCHMARK.md with measured metrics, external free/self-hosted OCR/layout availability blockers, hosting risks, and the production recommendation.

Outcome:
- Current extractor remains best measured candidate but is not production reliable: 50.0% exact row match, 0/6 exact sheets, 5.00 incorrect rows/page, 12 false high-confidence marks.
- Local deterministic OMR variants and the CPU classifier proxy did not improve accuracy.
- Tesseract, PaddleOCR/PP-Structure, Surya, and docTR were not installed locally; documented that OCR/layout alone does not solve handwritten mark scoring.

Recommendation:
- Do not enable auto-submit, auto-certification, or tenant opt-in OCR fallback from this corpus.
- Do not promote TASK-34.19 directly into production implementation until stronger registration/classification is prototyped and a larger representative corpus is collected.
- Paid cloud services remain excluded from the recommended production path.

Tests:
- node --check scripts/ops/score-sheet-import-extractor-benchmark.js
- npm run test:scoresheet-import:benchmark
- npm run test:scoresheet-import:calibration

Correction: external self-hosted tools were screened for availability and operating model only, not empirically benchmarked. TASK-34.18 is reopened until the installed-tool evaluation is completed or explicitly scoped out.

Follow-up correction completed in TASK-34.25: the top self-hosted contenders were installed and empirically benchmarked. Tesseract reached 3.3% exact row match, docTR reached 6.7%, PaddleOCR/PP-Structure is blocked by a PaddlePaddle illegal-instruction fault, and Surya is operationally impractical on this CPU-only host. The recommendation remains unchanged: do not enable tenant opt-in OCR fallback or reduce review/correction based on these contenders.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
