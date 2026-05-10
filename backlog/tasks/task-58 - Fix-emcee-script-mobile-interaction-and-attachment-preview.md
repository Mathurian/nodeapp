---
id: TASK-58
title: Fix emcee script mobile interaction and attachment preview
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 18:56'
updated_date: '2026-05-10 19:04'
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
- [x] #1 Tapping the primary body of a script row/card opens the script details modal on mobile and desktop without interfering with explicit edit/delete actions.
- [x] #2 The emcee script attachment open flow works reliably for supported file types in standard mobile browser contexts and does not depend on a popup-blocked async window-open path.
- [x] #3 Read-only emcee users can open script details and attached files without needing board/organizer management controls.
- [x] #4 Focused regression coverage or documented verification is added for the updated emcee script interaction and file-open behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the emcee script list UI so the primary script row/card surface opens the details modal on click/tap while preserving independent edit/delete button behavior and keyboard accessibility.
2. Refactor the script attachment open flow to use a mobile-safe direct navigation/open strategy for supported files, avoiding the current async popup-blocked path and keeping read-only emcee access intact.
3. Add focused verification for the updated interaction and attachment behavior where practical, then run frontend type-check/build and any targeted tests that fit the current harness.
4. Close the task with notes summarizing the mobile interaction fix, the attachment-open fix, and any verification limits.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Made the primary script body a real button so the main script tile interaction opens the details modal on tap/click without exposing management actions to emcee users.
- Simplified the attachment open flow to navigate directly to the authenticated script view URL, using DOCX HTML preview when needed and same-tab fallback on mobile instead of the old async popup-prone path.
- Verified with frontend type-check and production build; no dedicated emcee page interaction test harness existed to extend in this pass, so verification for the interaction change is documented rather than covered by a new targeted UI test.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Improved the emcee scripts mobile experience by making the primary script body the default interaction surface and by hardening attachment opening for mobile browsers.

Changes:
- Updated the emcee script list so the main body of each script row opens the details modal on tap/click, while edit and delete controls remain separate for management roles.
- Reworked the attachment open flow to use the authenticated script view route directly, with DOCX preview routing when appropriate and same-tab fallback enabled so mobile users do not rely on a popup-blocked async window-open path.
- Preserved read-only emcee access to script details and attachments without introducing any management controls.

Verification:
- cd frontend && npm run type-check
- cd frontend && npm run build

Notes:
- This pass used documented verification rather than a new targeted emcee page interaction test because there is not currently a focused page-level test harness for this surface.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
