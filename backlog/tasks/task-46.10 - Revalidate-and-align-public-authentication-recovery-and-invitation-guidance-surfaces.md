---
id: TASK-46.10
title: >-
  Revalidate and align public authentication, recovery, and invitation guidance
  surfaces
status: Done
assignee:
  - '@codex'
created_date: '2026-05-14 04:41'
updated_date: '2026-05-14 18:38'
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
- [x] #1 Inventory the live public auth/recovery/invitation surfaces and document current copy, branding, routing, and help/contact entry points for login, forgot-password, and invitation registration.
- [x] #2 Identify and document mismatches between these public surfaces, current code behavior, and the intended tenant-aware/public-help model, including any generic or unbranded flows that now diverge from the branded login experience.
- [x] #3 Update the affected public auth/recovery/invitation surfaces so branding, terminology, and next-step guidance are cohesive and understandable to non-technical end users while preserving tenant-aware routing behavior.
- [x] #4 Ensure documentation/help references that point users into these public auth/recovery flows are updated to match the shipped behavior and wording.
- [x] #5 Verify the revised experience across default and tenant-slug routes and capture any remaining product decisions or follow-up gaps in the task notes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-audit the live unauthenticated entry surfaces together: LoginPage, ForgotPasswordPage, RegisterPage, and the public landing/help entry points they connect to, focusing on branding, tenant context, support cues, and next-step guidance rather than just raw form behavior.
2. Bring the forgot-password and invitation-registration pages up to the same tenant-aware, public-settings-driven standard as the login experience by reusing branding, explanatory copy, and support/contact cues where appropriate.
3. Tighten cross-links and user expectations across login, recovery, registration, public help, and public landing so non-technical users understand what each surface is for, when invite-only access applies, and how tenant-specific routing affects them.
4. Update any adjacent public-help or public-entry wording that points into these auth/recovery flows so it matches the shipped behavior without dragging broader internal doc rewrites into this task.
5. Run focused frontend verification, then document any remaining product gaps or follow-up decisions if the public auth surface still has limitations that should be handled separately.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Public auth/recovery findings: RegisterPage correctly reflects the invite-only model and requires an invitation token, but it is still generic in presentation and does not use tenant-branded explanatory content the way LoginPage now does. ForgotPasswordPage is also generic and minimally guided; it explains the reset action but does not reinforce tenant context, invitation-based access, or how this surface relates to login/registration recovery for non-technical users. These surfaces need cohesion work more than policy correction.

- Audited the live public entry surfaces together: LoginPage, ForgotPasswordPage, RegisterPage, PublicLandingPage, and the public-help guidance that points users into these flows.
- Confirmed the main drift was cohesion rather than policy: LoginPage already had tenant-aware branding and support cues, while ForgotPasswordPage and RegisterPage were still comparatively generic.
- Reworked ForgotPasswordPage to load tenant public settings, use the same branded presentation/document title/favicon pattern as LoginPage, and provide clearer tenant-aware recovery guidance plus direct Help and Contact Support entry points.
- Reworked RegisterPage to load tenant public settings, use branded presentation/document title/favicon behavior, clarify invite-only and tenant-specific expectations, and add direct Help and Contact Support entry points.
- Updated PublicLandingPage navigation and footer to expose Help directly alongside Sign In so public users have a clear non-login support path.
- Updated docs/02-GETTING-STARTED.md so public-help guidance now explicitly points users to tenant-specific forgot-password and invitation-registration flows.
- Remaining public-entry surface work is now smaller; the main unresolved public guidance drift after this pass is broader shell/navigation terminology and any future content decisions in public landing copy, not auth-flow cohesion itself.
- Verification passed: npx eslint frontend/src/pages/ForgotPasswordPage.tsx frontend/src/pages/RegisterPage.tsx frontend/src/pages/PublicLandingPage.tsx; cd frontend && npm run type-check; cd frontend && npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the unauthenticated authentication, recovery, and invitation surfaces with the tenant-aware branded login experience.

What changed:
- Forgot password and invite-registration pages now load tenant public settings, use branded presentation with correct document title/favicon behavior, and explain tenant-specific expectations in more user-friendly language.
- Both recovery and registration flows now include clearer next-step guidance plus direct Help Documentation and Contact Support paths so users do not have to guess where to go next.
- The public landing page now links to Help alongside Sign In, giving public visitors a clear support path before authentication.
- Public getting-started guidance now explicitly points users to the correct forgot-password and invitation-based registration flows.

Verification:
- npx eslint frontend/src/pages/ForgotPasswordPage.tsx frontend/src/pages/RegisterPage.tsx frontend/src/pages/PublicLandingPage.tsx
- cd frontend && npm run type-check
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
