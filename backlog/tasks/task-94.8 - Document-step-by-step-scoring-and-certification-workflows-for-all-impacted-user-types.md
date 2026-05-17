---
id: TASK-94.8
title: >-
  Document step-by-step scoring and certification workflows for all impacted
  user types
status: To Do
assignee: []
created_date: '2026-05-17 04:27'
labels: []
dependencies: []
parent_task_id: TASK-94
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Produce practical walkthrough documentation for the final scoring, delegated scoring, delegated certification, and downstream certification flows so each impacted user type understands what they do, when they do it, and what the system records. This should cover normal app scoring, paper-form fallback, delegated entry, delegated certification when enabled, and the admin/operator setup and audit steps needed to support those workflows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Documentation includes step-by-step walkthroughs for the impacted user types, at minimum: judges, delegates, organizers or admins managing permissions and grants, tally masters, auditors, and board or final approvers where relevant.
- [ ] #2 The walkthrough explains the branching behavior between normal judge self-entry, delegated entry without delegate certification, and delegated entry with delegate certification enabled.
- [ ] #3 The walkthrough explicitly states what gets recorded for attribution, certification, revocation, and audit in each path so operators understand the chain of custody.
- [ ] #4 The walkthrough is aligned with the live permission model, delegated scoring controls, and rollout documentation rather than describing superseded behavior.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
