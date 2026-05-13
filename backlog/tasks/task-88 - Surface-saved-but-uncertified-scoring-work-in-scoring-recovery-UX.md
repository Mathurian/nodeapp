---
id: TASK-88
title: Surface saved but uncertified scoring work in scoring recovery UX
status: To Do
assignee: []
created_date: '2026-05-13 04:38'
updated_date: '2026-05-13 21:58'
labels: []
milestone: m-2
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow the TASK-84 offline scoring effort with a scoring-specific UX pass so judges can clearly find and resume server-saved but uncertified category+contestant work. The current offline modal only represents unsynced local drafts and queued writes; it does not surface saved-but-uncertified scoring work that still requires judge certification. This task should add an explicit, human-readable recovery/status flow for that state without conflating it with offline-only drafts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Saved but uncertified scoring work is surfaced in the scoring recovery/status UX with clear contestant and category identity.
- [ ] #2 Judges can jump directly from that UX to the relevant scoring context for the saved but uncertified contestant/category.
- [ ] #3 The UI clearly distinguishes unsynced local drafts/queued offline work from server-saved but uncertified scoring work.
- [ ] #4 Certification-pending scoring entries remain discoverable after refresh/relogin and do not depend on local draft presence.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
