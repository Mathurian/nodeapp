---
id: TASK-34.25
title: Install and benchmark self-hosted scoresheet extraction contenders
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-21 21:24'
updated_date: '2026-05-21 21:27'
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
- [ ] #1 A reproducible isolated install path exists for the selected self-hosted contenders, including Tesseract plus at least two model-based options from PaddleOCR/PP-Structure, Surya, and docTR unless a contender is explicitly blocked with a concrete install/runtime reason.
- [ ] #2 Each installed contender runs against the Education ground-truth corpus without changing the current scoresheet format, and raw outputs or intermediate artifacts are saved or summarized enough to debug failures.
- [ ] #3 The benchmark reports the same core metrics as TASK-34.18 for every runnable contender: exact row match, exact sheet match, incorrect rows per page, ambiguous rows per page, false high-confidence marks, rejection rate, runtime, and failure rate.
- [ ] #4 The evaluation documents hosting requirements and operational risks for every contender, including CPU/GPU practicality, memory/model-cache needs, offline viability, license posture, maintenance burden, and security/update concerns.
- [ ] #5 The recommendation states whether any self-hosted contender is accurate enough to proceed toward TASK-34.19/TASK-34.20, whether tenant opt-in fallback is justified, and whether review/correction can be reduced or removed under any assurance band.
- [ ] #6 Paid cloud services remain excluded from the recommended production path.
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
