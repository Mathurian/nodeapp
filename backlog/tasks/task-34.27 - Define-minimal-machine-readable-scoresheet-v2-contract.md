---
id: TASK-34.27
title: Define minimal machine-readable scoresheet v2 contract
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-25 16:39'
updated_date: '2026-05-25 16:40'
labels:
  - scoring
  - ocr
  - forms
dependencies: []
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Define the smallest score sheet format change needed to materially improve extraction assurance: registration anchors, template/version identity, judge/contestant/page identity, and machine-readable score marks while preserving the existing scoring workflow and minimizing operator disruption.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The v2 contract identifies the minimal visual changes to the current scoresheet needed for reliable OMR, including registration anchors, a template/version identifier, page identity fields, and score mark regions.
- [ ] #2 The contract preserves the current criterion scoring workflow and does not require changing category criteria, scoring caps, certification roles, or manual entry behavior.
- [ ] #3 The contract defines how v1/current sheets are detected and routed separately from v2 machine-readable sheets.
- [ ] #4 The contract documents operator-facing print/fill guidance and scanner expectations for v2 sheets.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Review the current OCR/import docs, scoreSheetImportTemplates config, and print/report surfaces to anchor the v2 contract in existing behavior.
2. Create a concise machine-readable v2 contract document that defines the minimal sheet changes: registration anchors, template/version identity, page identity, criterion rows, score mark regions, and scanner/fill guidance.
3. Define v1 vs v2 routing rules so current sheets stay review-required/manual-fallback while v2 sheets can be evaluated separately.
4. Define extraction metadata required by later work: anchor quality, template version, mark quality, rejected rows, multi-mark rows, and confidence-band inputs.
5. Update existing OCR reliability/phase docs to point from the failed current-sheet evidence toward the v2 path without changing runtime behavior.
6. Run lightweight verification for docs/task consistency and summarize the follow-on implementation boundaries for TASK-34.28 through TASK-34.30.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Created the Option B task chain: TASK-34.27 defines the minimal v2 contract, TASK-34.28 generates v2 print output, TASK-34.29 implements v2 OMR extraction, and TASK-34.30 validates assurance/rollout policy.
- Initial code search found the current import template map in src/config/scoreSheetImportTemplates.ts and general print/report services, but no obvious dedicated printable scoresheet generator implementation yet. TASK-34.27 will document the contract before TASK-34.28 locates or adds the smallest generation surface.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
