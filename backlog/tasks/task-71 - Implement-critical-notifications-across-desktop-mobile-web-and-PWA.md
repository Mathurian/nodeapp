---
id: TASK-71
title: 'Implement critical notifications across desktop, mobile web, and PWA'
status: To Do
assignee: []
created_date: '2026-05-11 04:05'
updated_date: '2026-05-11 04:11'
labels: []
milestone: m-2
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add support for sending critical notifications through the in-app messaging system with delivery behavior that is prominent and reliable across desktop browsers, mobile browsers, and installed PWAs where platform support allows it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Admins or other authorized senders can mark a notification as critical when sending to users or broadcasting by role.
- [ ] #2 Critical notifications use elevated delivery behavior appropriate to the client surface, including in-app prominence on desktop/mobile web and push/high-visibility delivery for subscribed PWAs where supported.
- [ ] #3 When a platform cannot support the strongest delivery mechanism, the system falls back predictably and the user experience/documentation reflects that limitation.
- [ ] #4 The implementation preserves existing notification preference and permission rules except where an explicitly defined critical-notification policy allows stricter delivery behavior.
- [ ] #5 The feature is covered by focused backend/frontend tests and verified across the supported client contexts to the extent possible in the environment.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
