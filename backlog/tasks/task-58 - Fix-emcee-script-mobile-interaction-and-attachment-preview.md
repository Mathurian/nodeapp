---
id: TASK-58
title: Fix emcee script mobile interaction and attachment preview
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 18:56'
updated_date: '2026-05-10 19:00'
labels:
  - emcee
  - mobile
  - ux
  - files
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the emcee scripts experience behave intuitively on mobile and harden the attachment open flow so read-only emcee users can reliably open attached script files from the script list and modal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tapping the primary body of a script row/card opens the script details modal on mobile and desktop without interfering with explicit edit/delete actions.
- [ ] #2 The emcee script attachment open flow works reliably for supported file types in standard mobile browser contexts and does not depend on a popup-blocked async window-open path.
- [ ] #3 Read-only emcee users can open script details and attached files without needing board/organizer management controls.
- [ ] #4 Focused regression coverage or documented verification is added for the updated emcee script interaction and file-open behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the emcee script list UI so the primary script row/card surface opens the details modal on click/tap while preserving independent edit/delete button behavior and keyboard accessibility.
2. Refactor the script attachment open flow to use a mobile-safe direct navigation/open strategy for supported files, avoiding the current async popup-blocked path and keeping read-only emcee access intact.
3. Add focused verification for the updated interaction and attachment behavior where practical, then run frontend type-check/build and any targeted tests that fit the current harness.
4. Close the task with notes summarizing the mobile interaction fix, the attachment-open fix, and any verification limits.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
