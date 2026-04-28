---
id: TASK-12
title: Re-run npm audit and update remediation matrix
status: To Do
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-04-28 02:31'
labels:
  - npm
  - security
  - docs
dependencies:
  - TASK-8
  - TASK-9
  - TASK-10
  - TASK-11
priority: medium
ordinal: 12
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After the dependency remediation tasks are complete, capture the real post-upgrade dependency state and update the project record. Re-run `npm ci --omit=dev`, gather `npm audit --omit=dev` results from a network-enabled environment, and update `docs/NPM-REMEDIATION-MATRIX.md` with the remaining advisories, resolved chains, and any issues that still require acceptance or follow-up work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm ci warning output is captured after upgrades
- [ ] #2 npm audit results are recorded from a network-enabled environment
- [ ] #3 The remediation matrix documentation is updated with remaining issues and outcomes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-run `npm ci --omit=dev` and capture the remaining warning output after remediation work lands.
2. Re-run `npm audit --omit=dev` from a network-enabled environment and record the remaining advisories.
3. Update `docs/NPM-REMEDIATION-MATRIX.md` with resolved chains, remaining risks, and any follow-up items.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
This task should produce a decision-quality summary. If unresolved issues remain, capture them clearly and create follow-up tasks instead of overloading this task.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
