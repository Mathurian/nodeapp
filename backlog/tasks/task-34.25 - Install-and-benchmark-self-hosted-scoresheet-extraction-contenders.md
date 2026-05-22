---
id: TASK-34.25
title: Install and benchmark self-hosted scoresheet extraction contenders
status: Done
assignee:
  - '@codex'
created_date: '2026-05-21 21:24'
updated_date: '2026-05-21 22:21'
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
Install and run the strongest free/self-hosted OCR, layout, and document-vision contenders against the current Education scoresheet corpus so TASK-34.18 can be completed with empirical evidence instead of availability screening. This task should preserve the current scoresheet format and evaluate whether any self-hosted option can materially improve mark extraction reliability without forcing paper-form changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A reproducible isolated install path exists for the selected self-hosted contenders, including Tesseract plus at least two model-based options from PaddleOCR/PP-Structure, Surya, and docTR unless a contender is explicitly blocked with a concrete install/runtime reason.
- [x] #2 Each installed contender runs against the Education ground-truth corpus without changing the current scoresheet format, and raw outputs or intermediate artifacts are saved or summarized enough to debug failures.
- [x] #3 The benchmark reports the same core metrics as TASK-34.18 for every runnable contender: exact row match, exact sheet match, incorrect rows per page, ambiguous rows per page, false high-confidence marks, rejection rate, runtime, and failure rate.
- [x] #4 The evaluation documents hosting requirements and operational risks for every contender, including CPU/GPU practicality, memory/model-cache needs, offline viability, license posture, maintenance burden, and security/update concerns.
- [x] #5 The recommendation states whether any self-hosted contender is accurate enough to proceed toward TASK-34.19/TASK-34.20, whether tenant opt-in fallback is justified, and whether review/correction can be reduced or removed under any assurance band.
- [x] #6 Paid cloud services remain excluded from the recommended production path.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reconfirm the current benchmark baseline and the runnable corpus so external contenders are compared against the same Education pages and metrics as TASK-34.18.
2. Probe local install/runtime constraints for Tesseract, PaddleOCR/PP-Structure, Surya, and docTR, including Python version support, model download behavior, disk/runtime footprint, CPU-only viability, and whether a tool requires system packages.
3. Add a reproducible isolated install path for the contenders: prefer /tmp or temp/ virtual environments and model caches for Python tools; use a clearly documented system-package step only for Tesseract if no isolated binary path is practical.
4. Extend the benchmark harness or add a companion runner so installed contenders execute against the Education corpus and save raw/intermediate outputs for debugging without changing production import behavior or the current score sheets.
5. Map each contender output back into score rows only where defensible; if a tool provides OCR/layout but not mark classification, score the complete pipeline honestly and document the missing mark-classification gap rather than inferring success.
6. Run the benchmark, collect metrics for every runnable contender, and record concrete blockers for any contender that cannot be installed or executed.
7. Update the operations documentation and backlog notes with empirical results, hosting/licensing/offline/security risks, and a recommendation on whether any option justifies TASK-34.19/TASK-34.20 or tenant opt-in fallback.
8. Run verification: syntax checks for new scripts, the self-hosted benchmark command, and the existing scoresheet calibration regression.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Installed Tesseract 5.3.4 from Ubuntu packages after apt confirmed no isolated binary was practical on this host.
- Created isolated Python virtualenvs under /tmp/scoresheet-selfhosted for docTR, Surya, and PaddleOCR/PP-Structure.
- Confirmed docTR and Tesseract execute against the Education corpus; PaddlePaddle import faults with illegal instruction; Surya installs but CPU one-page inference does not complete within a practical diagnostic window.

- Final installed benchmark results: Tesseract exact-row 3.3% with 88.3% row rejection; docTR exact-row 6.7% with 88.3% row rejection and 154.7s runtime for six pages.
- PaddleOCR/PP-Structure remains blocked by a fatal PaddlePaddle illegal-instruction fault during import.
- Surya installs with CPU PyTorch and a transformers pin, but one-page OCR/layout inference timed out at 120s in the repeatable benchmark and was manually observed still unfinished after almost six minutes.
- Recommendation documented: no evaluated self-hosted contender justifies auto-submit, auto-certification, tenant opt-in OCR fallback, or removal of review/correction.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Installed and benchmarked the strongest free/self-hosted scoresheet extraction contenders against the Education corpus without changing the production import path or score sheet format.

Changes:
- Added an isolated setup script for Tesseract, docTR, Surya, and PaddleOCR/PP-Structure under /tmp/scoresheet-selfhosted.
- Added a self-hosted contender benchmark that renders the corpus, saves raw OCR/model artifacts, maps defensible OCR mark tokens into the existing fixed grid, and reports exact row/sheet match, incorrect/ambiguous rows, false high-confidence marks, rejection rate, failure rate, and runtime.
- Updated the operations benchmark doc with installed versions, artifact paths, cache footprint, license posture, CPU/GPU practicality, offline/maintenance risks, measured results, and recommendation.

Outcome:
- Tesseract ran but reached only 3.3% exact row match.
- docTR ran but reached only 6.7% exact row match and took 154.7s for six pages.
- PaddleOCR/PP-Structure is blocked by a fatal PaddlePaddle illegal-instruction fault on this host.
- Surya installs but one-page CPU inference timed out at 120s and was manually observed still unfinished after almost six minutes.

Recommendation:
No evaluated self-hosted contender is accurate or operationally practical enough to justify auto-submit, auto-certification, tenant opt-in OCR fallback, or removal of review/correction. The next useful path is a purpose-built form-registration plus mark-classification prototype with a larger real scan/photo corpus.

Verification:
- node --check scripts/ops/score-sheet-self-hosted-contender-benchmark.js
- python3 -m py_compile scripts/ops/run-doctr-scoresheet-ocr.py
- bash -n scripts/ops/setup-score-sheet-self-hosted-contenders.sh
- npm run test:scoresheet-import:self-hosted-contenders
- npm run test:scoresheet-import:calibration
- git diff --check
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
