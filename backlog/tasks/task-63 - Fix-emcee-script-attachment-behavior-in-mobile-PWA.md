---
id: TASK-63
title: Fix emcee script attachment behavior in mobile PWA
status: To Do
assignee: []
created_date: '2026-05-10 21:41'
updated_date: '2026-05-10 21:43'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and fix the mobile/PWA regression where emcee script attachments open twice and returning from the attachment can leave the app shell in a broken state.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Opening an emcee script attachment on mobile/PWA results in a single intentional navigation behavior.
- [ ] #2 Returning from an opened attachment does not leave the app header or menu in a broken state.
- [ ] #3 Attachment viewing remains functional for supported script file types after the fix.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
