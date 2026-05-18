---
id: TASK-96.5
title: Expose delegated certification in scoring workspace for DELEGATE users
status: To Do
assignee: []
created_date: '2026-05-18 20:30'
labels: []
dependencies: []
parent_task_id: TASK-96
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Complete the delegated certification rollout by surfacing the certify/signoff flow in /scoring for DELEGATE users when delegated certification is enabled and permitted. The backend permission and grant validation path already exists, but the current scoring page still gates certification UI to self-scoring JUDGE users only.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A DELEGATE user with delegated certification enabled, delegated-scores:certify permission, and an active applicable grant can access the certification flow in /scoring for the represented judge.
- [ ] #2 A DELEGATE user does not see or cannot trigger delegated certification in /scoring when the tenant toggle, permission, or grant coverage is missing.
- [ ] #3 The /scoring certification UI clearly distinguishes delegated judge certification from ordinary self-judge certification.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
