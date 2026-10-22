---
id: TASK-114
title: Require verified TLS across outbound SMTP transports
status: To Do
assignee: []
created_date: '2026-10-22 19:48'
labels: []
dependencies: []
references:
  - src/services/EmailService.ts
  - src/services/SettingsService.ts
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Nodemailer upgrade leaves the runtime and settings test-email paths with different TLS behavior. A server without STARTTLS can accept credentials and message data in plaintext. Align transport policy and prove fail-closed behavior before considering this gap closed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Environment, tenant settings, and settings test-email paths use one SMTP security policy: implicit TLS on port 465 and required, validated STARTTLS on other supported ports; any plaintext relay exception is explicit and documented.
- [ ] #2 Normal mail and test-email flows succeed against authenticated port 587 STARTTLS and port 465 implicit TLS, and test-email sends only to the validated recipient.
- [ ] #3 No STARTTLS, invalid certificate, and rejected credentials fail before message acceptance; credentials and message data are not sent over plaintext.
- [ ] #4 A controlled staging provider test verifies authentication, accepted delivery, and absence of secrets in logs.
- [ ] #5 Build and focused mail tests pass on Node 24.22.1.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
