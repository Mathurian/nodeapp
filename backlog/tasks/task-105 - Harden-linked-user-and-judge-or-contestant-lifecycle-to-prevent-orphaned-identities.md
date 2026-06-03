---
id: TASK-105
title: >-
  Harden linked user and judge or contestant lifecycle to prevent orphaned
  identities
status: To Do
assignee: []
created_date: '2026-06-02 04:57'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Close the remaining lifecycle gap for linked identities so operators cannot orphan judge or contestant records from their associated login accounts, or vice versa, through direct deletion flows. Scope includes judge and contestant deletion paths, user-linked guardrails, and safer operator outcomes such as deactivation or explicit remediation guidance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Deleting or removing a judge profile that is still linked to a user account is blocked or safely redirected to a supported deactivation workflow.
- [ ] #2 Deleting or removing a contestant profile that is still linked to a user account is blocked or safely redirected to a supported deactivation workflow.
- [ ] #3 Lifecycle guardrails also account for linked operational data such as assignments, scores, certifications, or other records that make hard deletion unsafe.
- [ ] #4 Operator-facing errors clearly explain why hard deletion is blocked and what supported action to use instead.
- [ ] #5 Focused regression coverage or a repeatable verification path proves linked identity deletion no longer creates orphaned auth or operational records.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
