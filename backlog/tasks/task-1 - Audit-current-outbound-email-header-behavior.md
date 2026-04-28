---
id: TASK-1
title: Audit current outbound email header behavior
status: To Do
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-04-28 02:31'
labels:
  - email
  - backend
dependencies: []
priority: medium
ordinal: 1
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Research the current outbound email behavior before any header changes are implemented. Review `src/services/EmailService.ts` as the primary send path, `src/services/ReportEmailService.ts` and `src/controllers/emailController.ts` as higher-level callers, `src/services/SettingsService.ts` for the test-email path, and any direct `nodemailer` usage in the repo. The output of this task should be a concise inventory of outbound entry points, the headers currently set today (`from` / `fromName`, no `replyTo`), and any flows that bypass `EmailService.sendEmail` so later email tasks can stay additive and low-risk.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All outbound email entry points are identified
- [ ] #2 Any mail paths bypassing the shared EmailService are documented
- [ ] #3 Current from/from-name behavior is documented with affected files
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Search the repo for all outbound email entry points and direct `nodemailer` usage.
2. Trace the current sender-header and settings resolution behavior in the shared email path and test-email path.
3. Record the inventory, current headers, and any bypasses for later tasks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Research-only task. No runtime behavior should change here. Output should give later tasks enough context to stay additive and low-risk.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
