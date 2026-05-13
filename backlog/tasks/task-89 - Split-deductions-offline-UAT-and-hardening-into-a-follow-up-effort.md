---
id: TASK-89
title: Split deductions offline UAT and hardening into a follow-up effort
status: To Do
assignee: []
created_date: '2026-05-13 20:21'
updated_date: '2026-05-13 21:59'
labels: []
milestone: m-0
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Continue the broader offline JSON workflow work by separating deductions-specific UAT, bug fixing, and UX hardening from TASK-84. Scoring and commentary have now received focused production UAT, but deductions has not been exercised and should be handled as its own pass rather than continuing to block closure of the validated scoring/commentary portion of TASK-84.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A dedicated follow-up task exists for deductions offline draft persistence, queued submission, restore, and reconnect-sync verification.
- [ ] #2 The deductions effort explicitly covers production UAT scenarios, defect remediation, and any UX issues found during that pass.
- [ ] #3 TASK-84 notes clearly reference the split so the scoring/commentary validation record remains accurate.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
