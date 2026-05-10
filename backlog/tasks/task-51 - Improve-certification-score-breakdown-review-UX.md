---
id: TASK-51
title: Improve certification score breakdown review UX
status: To Do
assignee: []
created_date: '2026-05-10 06:38'
updated_date: '2026-05-10 06:38'
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
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
