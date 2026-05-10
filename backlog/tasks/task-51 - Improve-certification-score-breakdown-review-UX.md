---
id: TASK-51
title: Improve certification score breakdown review UX
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 06:38'
updated_date: '2026-05-10 06:42'
labels:
  - ux
  - certifications
  - review
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The certification overview and related tally/auditor review surfaces currently present score breakdown details as long flat lists of judges, criteria, and rows that are difficult to audit efficiently. Improve the review experience so tally masters, auditors, and other certification reviewers can quickly understand score composition, spot anomalies, and complete review without excessive scrolling or manual parsing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Certification review surfaces used by tally masters, auditors, and related reviewer roles present score breakdowns in a structured format that is materially easier to scan than the current long flat list.
- [ ] #2 The updated breakdown design helps reviewers understand score composition by contestant, judge, category, criterion, or other appropriate grouping without hiding necessary detail.
- [ ] #3 The review flow makes it practical to identify missing, unusual, or outlier scores and navigate back to the relevant certification context efficiently.
- [ ] #4 The implementation preserves the underlying certification data accuracy while improving reviewer usability on both desktop and mobile where relevant.
- [ ] #5 The updated certification score-breakdown review experience remains practical on mobile, with grouped sections, anomaly cues, and navigation patterns that avoid reintroducing long flat scrolling review flows on smaller screens.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit the existing certification workspace score-breakdown flow and define a reviewer-oriented information hierarchy for tally/auditor use: summary signals first, then grouped detail by contestant with clear judge/criterion structure.
2. Add derived frontend review models in CertificationOverviewWorkspace so the flat score-review payload is reorganized into scan-friendly groups, rollups, and anomaly indicators without changing certification data integrity.
3. Replace the current long flat breakdown list with a structured review UI that exposes per-contestant sections, judge/criterion summaries, and clear status chips for missing, uncertified, or unlocked rows, while preserving access to row-level detail.
4. Improve navigation within the expanded certification breakdown so reviewers can move between contestants/summary sections efficiently on desktop and mobile, and verify the shared workspace still behaves correctly across tally/auditor certification pages.
5. Run focused frontend verification and capture the reviewed surfaces, chosen grouping approach, and any intentionally deferred follow-up ideas in task notes/final summary.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
