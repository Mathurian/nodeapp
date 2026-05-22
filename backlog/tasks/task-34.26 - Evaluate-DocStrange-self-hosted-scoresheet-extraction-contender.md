---
id: TASK-34.26
title: Evaluate DocStrange self-hosted scoresheet extraction contender
status: Done
assignee:
  - '@codex'
created_date: '2026-05-21 23:53'
updated_date: '2026-05-22 04:12'
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
Clean up previous self-hosted contender artifacts to recover disk space, then install and empirically evaluate NanoNets DocStrange against the current Education scoresheet corpus without changing the score sheet format or production import path.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Previous self-hosted contender virtualenvs and model caches are removed or intentionally preserved with a documented reason.
- [x] #2 DocStrange install/runtime requirements, license posture, model/cache footprint, and CPU/GPU practicality are documented from primary sources and local execution.
- [x] #3 DocStrange is run against the Education corpus when install/runtime constraints allow it, with raw/intermediate artifacts saved or summarized for debugging.
- [x] #4 The evaluation reports comparable import metrics where defensible, or records a concrete blocker if DocStrange cannot produce score-row output.
- [x] #5 The recommendation states whether DocStrange changes the TASK-34.25 conclusion about tenant opt-in fallback, auto-submit, auto-certification, or removing review/correction.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Remove the previous contender venvs and model caches from /tmp and known cache locations, then confirm recovered disk footprint.
2. Review DocStrange primary repository/docs for install path, license, hardware expectations, model behavior, and intended output shape.
3. Install DocStrange in an isolated /tmp location if the runtime is feasible and network/install approvals allow it.
4. Add a companion benchmark path or one-off runner that feeds the existing Education normalized page images to DocStrange, saves outputs, and maps output to score rows only if defensible.
5. Run the benchmark or record concrete blockers, update the operations doc and backlog notes, then verify no production import regression.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Removed previous contender virtualenvs and model caches: /tmp/scoresheet-selfhosted, /home/mat/.cache/datalab, /home/mat/.cache/doctr, and /home/mat/.paddlex.
- Cleanup freed roughly 5.8G; only the small prior benchmark artifact directory remains at temp/scoresheet-selfhosted-benchmark (~6.2M).

- Installed DocStrange in /tmp/scoresheet-docstrange with CPU-only PyTorch first; package metadata reports docstrange 1.1.8, CLI reports v1.1.5, and license is MIT.
- Confirmed public local mode is GPU-only on this host: DocumentExtractor(gpu=True) fails because no CUDA GPU is available. Default mode is cloud and was intentionally not used for scoresheet data.
- Added scripts/ops/run-docstrange-scoresheet-ocr.py and scripts/ops/score-sheet-docstrange-benchmark.js plus npm run test:scoresheet-import:docstrange.
- Internal CPU route was attempted with isolated caches, conservative ATEN CPU capability, single-threading, and NNPACK/MKLDNN disabled; it still exits with SIGILL/native invalid opcode in libtorch_cpu.so before returning one page.
- Final DocStrange footprint is about 2.2G under /tmp/scoresheet-docstrange; previous contender caches remain removed.
- Documentation updated with DocStrange blocker and recommendation: no change to TASK-34.25 conclusion.

- Added scripts/ops/setup-score-sheet-docstrange-contender.sh so the DocStrange venv can be recreated before rerunning npm run test:scoresheet-import:docstrange.
- Removed /tmp/scoresheet-docstrange after preserving temp/scoresheet-docstrange-benchmark/docstrange-report.json, freeing the measured ~2.2G DocStrange footprint.
- Confirmed all heavyweight contender install/cache directories are now absent.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Cleaned up the previous self-hosted contender artifacts, then installed and evaluated NanoNets DocStrange as a supplemental TASK-34 scoresheet import contender.

Changes:
- Removed the prior /tmp/scoresheet-selfhosted virtualenvs and model caches under /home/mat, recovering roughly 5.8G.
- Added a DocStrange local OCR runner and benchmark wrapper that render the current Education page, test DocStrange public local mode, attempt internal CPU OCR with isolated caches, and write temp/scoresheet-docstrange-benchmark/docstrange-report.json.
- Added npm run test:scoresheet-import:docstrange.
- Updated docs/operations/OCR-SCORESHEET-SELF-HOSTED-BENCHMARK.md with DocStrange install/runtime requirements, footprint, license, cloud-vs-local behavior, blocker, and recommendation.

Outcome:
- DocStrange package metadata reports 1.1.8 and MIT license; CLI prints v1.1.5.
- Public local mode requires CUDA GPU and fails on this CPU-only host.
- Default cloud mode was not used because this evaluation is limited to self-hosted processing and the scoresheet corpus should not be uploaded without explicit approval.
- Internal CPU processing was attempted with isolated caches and conservative CPU settings, but it exits with SIGILL/native invalid opcode in libtorch_cpu.so before returning one page, so no score-row metrics are defensible.

Recommendation:
DocStrange does not change the TASK-34.25 conclusion: it is not viable as a self-hosted fallback on this host and does not justify tenant opt-in fallback, auto-submit, auto-certification, or removing review/correction.

Verification:
- node --check scripts/ops/score-sheet-docstrange-benchmark.js
- python3 -m py_compile scripts/ops/run-docstrange-scoresheet-ocr.py
- npm run test:scoresheet-import:docstrange
- npm run test:scoresheet-import:calibration
- git diff --check

Post-evaluation cleanup:
- Added scripts/ops/setup-score-sheet-docstrange-contender.sh to recreate the DocStrange environment on demand.
- Removed /tmp/scoresheet-docstrange after preserving the benchmark report, so no heavyweight contender venv/model cache remains installed.
- Verified the setup script with bash -n.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
