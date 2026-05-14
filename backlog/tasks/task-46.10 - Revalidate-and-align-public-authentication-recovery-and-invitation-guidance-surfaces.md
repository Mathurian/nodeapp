---
id: TASK-46.10
title: >-
  Revalidate and align public authentication, recovery, and invitation guidance
  surfaces
status: To Do
assignee: []
created_date: '2026-05-14 04:41'
updated_date: '2026-05-14 05:06'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit and update the unauthenticated user entry surfaces so login, forgot-password, invitation registration, and related public entry guidance use consistent tenant-aware branding, terminology, help/contact cues, and expectations for non-technical end users.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inventory the live public auth/recovery/invitation surfaces and document current copy, branding, routing, and help/contact entry points for login, forgot-password, and invitation registration.
- [ ] #2 Identify and document mismatches between these public surfaces, current code behavior, and the intended tenant-aware/public-help model, including any generic or unbranded flows that now diverge from the branded login experience.
- [ ] #3 Update the affected public auth/recovery/invitation surfaces so branding, terminology, and next-step guidance are cohesive and understandable to non-technical end users while preserving tenant-aware routing behavior.
- [ ] #4 Ensure documentation/help references that point users into these public auth/recovery flows are updated to match the shipped behavior and wording.
- [ ] #5 Verify the revised experience across default and tenant-slug routes and capture any remaining product decisions or follow-up gaps in the task notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Public auth/recovery findings: RegisterPage correctly reflects the invite-only model and requires an invitation token, but it is still generic in presentation and does not use tenant-branded explanatory content the way LoginPage now does. ForgotPasswordPage is also generic and minimally guided; it explains the reset action but does not reinforce tenant context, invitation-based access, or how this surface relates to login/registration recovery for non-technical users. These surfaces need cohesion work more than policy correction.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
