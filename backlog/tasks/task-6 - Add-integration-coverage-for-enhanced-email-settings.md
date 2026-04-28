---
id: TASK-6
title: Add integration coverage for enhanced email settings
status: To Do
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-04-28 03:07'
labels:
  - email
  - tests
dependencies:
  - TASK-2
  - TASK-3
  - TASK-4
  - TASK-5
priority: medium
ordinal: 6
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add focused regression coverage for the enhanced email settings through integration and smoke-level checks. Cover tenant-aware settings persistence in the existing settings integration coverage, the admin settings save path where appropriate, and runtime header behavior for from-name and reply-to without depending on the currently broken low-level backend test suite. The goal is to prove the reply-to enhancement is additive and does not regress current SMTP/from-name behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Integration coverage verifies tenant-scoped reply-to settings persistence
- [ ] #2 Runtime or smoke coverage verifies from-name and reply-to header behavior
- [ ] #3 The test-email bypass is validated through integration or smoke checks
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Extend settings integration coverage for tenant-scoped reply-to read/write behavior.
2. Add runtime or smoke validation for from-name and reply-to header application.
3. Validate the test-email bypass through integration or smoke checks and document the commands used.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Focus coverage on the additive reply-to enhancement and no-regression behavior for existing sender settings. Audit finding: the direct `testEmailSettings` path is a real bypass and needs explicit integration or smoke validation, not just shared `EmailService` coverage.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
