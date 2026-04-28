---
id: TASK-1
title: Audit current outbound email header behavior
status: Done
assignee: []
created_date: '2026-04-28 01:59'
updated_date: '2026-04-27 21:40'
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
- [x] #1 All outbound email entry points are identified
- [x] #2 Any mail paths bypassing the shared EmailService are documented
- [x] #3 Current from/from-name behavior is documented with affected files
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Search the repo for all outbound email entry points and direct `nodemailer` usage.
2. Trace the current sender-header and settings resolution behavior in the shared email path and test-email path.
3. Record the inventory, current headers, and any bypasses for later tasks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Audit results:

- Shared outbound runtime is `src/services/EmailService.ts`.
- Current shared callers are `src/controllers/emailController.ts`, `src/controllers/EmailTemplateController.ts`, `src/services/AuthService.ts`, `src/services/EmailDigestService.ts`, `src/services/ReportEmailService.ts`, `src/jobs/EmailJobProcessor.ts`, and wrapper-based flows such as `sendInvitationEmail` / `sendVirusAlertEmail`.
- `EmailService.sendEmail` currently sends `from`, `to`, `subject`, `text`, `html`, and `attachments`. It does not set `replyTo`.
- `resolveSmtpRuntimeConfig` already resolves `fromName`, but `sendEmail` does not apply that value to the actual `from` header. Existing tasks therefore need to treat `fromName` activation as part of the runtime enhancement, not just reply-to support.
- `src/services/SettingsService.ts:testEmailSettings` is a direct `nodemailer.createTransport(...).sendMail(...)` bypass. It currently sets only a raw `from` address and will need separate treatment for header parity.
- `src/services/VirusScanService.ts:notifyInfection` is a second non-standard path. It dynamically resolves `EmailService` and calls `emailService.send(...)` behind `@ts-expect-error`, not the typed `sendEmail` / `sendVirusAlertEmail` path. That should be treated as an existing cleanup risk, not folded into the first reply-to change unless required.
- Current settings persistence supports `email_from_address` / `email_from_name` aliases in `src/services/SettingsService.ts`, but there are no reply-to keys yet.
- Current admin settings UI in `frontend/src/pages/SettingsPage.tsx` already exposes From Address and From Name. Reply-to is not present.

Implementation impact for follow-on tasks:

1. Runtime work must include actual display-name `From` header application, not only reply-to.
2. Validation and tests must cover the `testEmailSettings` bypass explicitly.
3. UI work only needs to add reply-to fields; from-name editing already exists.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
