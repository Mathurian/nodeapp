---
id: TASK-46.2
title: >-
  Revalidate and rewrite role-specific onboarding and user guidance across all
  roles
status: Done
assignee:
  - '@codex'
created_date: '2026-05-14 00:03'
updated_date: '2026-05-14 18:16'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Perform a role-by-role rewrite pass on user-facing onboarding and guidance surfaces, including the welcome guide modal, login/recovery/help entry guidance, and any related user-facing explanatory copy that describes what each role can do. The goal is to ensure every role description matches the current coded workflow and is understandable to non-technical users, with special attention to certification, results visibility, and route/workspace expectations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every role exposed through the welcome/onboarding guidance (SUPER_ADMIN, ADMIN, ORGANIZER, BOARD, JUDGE, TALLY_MASTER, AUDITOR, EMCEE, CONTESTANT) is reviewed line by line against current shipped behavior.
- [x] #2 Role guidance is rewritten where needed so workflow descriptions, feature labels, certification expectations, and results visibility statements match the actual product behavior and route structure.
- [x] #3 Related public/auth guidance surfaces such as login, password recovery, and help entry text are checked for coherence with the revised role guidance.
- [x] #4 Any unresolved wording or product-intent ambiguities discovered during the rewrite are documented explicitly for review rather than guessed at.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-audit the live role guidance surfaces that actually teach users how the app works today: CommandPaletteOnboarding, dashboard greetings/descriptions/quick actions, and any nearby user-facing copy that names workflows or destinations by role.
2. Rewrite every role entry in the welcome guide so its summary, primary features, workflow steps, and tips match the current coded route structure and visibility model, with special attention to judge certification, tally scope, the single auditor certification flow, emcee limitations, and contestant results visibility.
3. Update dashboard role descriptions and quick-action labels where they currently promise pages or outcomes too broadly, especially conditional results access and auditor/tally terminology.
4. Review adjacent public/auth guidance surfaces that overlap with role expectations, then make only the coherence fixes that belong in this task and leave broader public-auth work in TASK-46.10.
5. Run focused frontend verification, then record any remaining wording ambiguities explicitly instead of guessing if the live product model still leaves a user-facing decision unresolved.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Resolved wording decision from TASK-46 audit: auditor-facing guidance should present one auditor certification flow. If the UI still exposes both 'Pending Audits' and 'Final Certification', documentation should explain one underlying workflow and call the alternate title a legacy/alternate label rather than implying two distinct end-user processes.

Seed findings from parent audit: login is tenant-branded and currently links mobile install instructions into docs/02-GETTING-STARTED, while forgot-password and invite-registration pages are comparatively generic/unbranded. Rewrite work should treat login, recovery, registration, help entry, and onboarding as one coherent user-guidance surface rather than isolated pages.

Dashboard quick actions also need wording review, not just welcome cards. Examples: judge and contestant dashboards advertise 'View Results' even though results access is conditional; auditor uses generic /dashboard plus quick links into audit/certification flows rather than a standalone auditor home route. Rewrite should avoid promising availability where access depends on visibility or publication state.

Public auth/recovery surfaces were reviewed directly. LoginPage is tenant-aware and branded from public settings, while ForgotPasswordPage and RegisterPage remain comparatively generic and lightly guided.

Because that unauthenticated public-surface work is larger than role onboarding copy alone, it has been split into TASK-46.10 rather than being kept implicit inside 46.2.

CommandPaletteOnboarding still uses legacy auditor labels ('Pending Audits' and 'Final Certification') inside the live role welcome guide. That conflicts with the chosen model of one auditor certification flow with a legacy-label note.

Auditor live UI review confirms partial migration: AuditorPendingAuditsPage already uses 'Pending Auditor Certifications', but AuditorPage quick links and the role welcome guide still use older labels like 'Pending Audits'.

Line-level role-guidance findings: CommandPaletteOnboarding still contains multiple live-role mismatches. TALLY_MASTER still lists Reports as a primary feature even though the visible tally workflow centers on Tally Dashboard and Certifications rather than a dedicated reports workspace. AUDITOR still presents Pending Audits, Certifications, Final Certification, and Audit Log as if they are distinct primary destinations, which conflicts with the approved documentation model of one auditor certification flow with a legacy-label note. EMCEE guidance remains close but should stay careful not to imply script-management authority for pure EMCEE users. CONTESTANT guidance is materially better aligned because it now frames results visibility as conditional.

- Rewrote the live role welcome guide in frontend/src/components/CommandPaletteOnboarding.tsx across all exposed roles, correcting workflow summaries, primary features, workflow steps, and tips against the current product model.
- Added explicit SUPER_ADMIN dashboard guidance instead of falling back to the generic default copy.
- Corrected judge guidance to keep certification inside scoring, not the shared certifications workspace.
- Corrected tally guidance to focus on tally dashboard/certification/governance rather than implying a reports-centered workflow.
- Corrected auditor guidance to describe one auditor certification flow, renamed the primary feature to Pending Auditor Certifications, and added a note that older labels such as Pending Audits or Final Certification may still appear for the same workflow.
- Tightened emcee wording so it does not imply template or system-wide script-management authority for pure emcee users.
- Kept contestant results language explicitly conditional on visibility and publication state.
- Updated frontend/src/pages/DashboardPage.tsx role greetings, descriptions, and quick-action labels so they no longer over-promise always-available results or teach admin-like board workflows; added a dedicated SUPER_ADMIN quick-action set.
- Updated frontend/src/pages/AuditorPage.tsx button labels/subtitle to align with the one-flow auditor model.
- Made small tenant-coherence fixes in frontend/src/pages/ForgotPasswordPage.tsx and frontend/src/pages/RegisterPage.tsx so recovery/invite guidance better matches the role-aware tenant model without pulling broader public-auth work out of TASK-46.10.
- Remaining legacy route-label cleanup in shared shell/navigation surfaces is still better tracked under TASK-46.9 rather than expanded here.
- Verification passed: npx eslint frontend/src/components/CommandPaletteOnboarding.tsx frontend/src/pages/DashboardPage.tsx frontend/src/pages/AuditorPage.tsx frontend/src/pages/ForgotPasswordPage.tsx frontend/src/pages/RegisterPage.tsx; cd frontend && npm run type-check; cd frontend && npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the role-by-role rewrite pass for live onboarding and adjacent user-guidance surfaces.

What changed:
- Rewrote the role welcome guide so every exposed role now uses workflow descriptions and tips that match the shipped route structure and visibility model.
- Fixed the biggest guidance drifts: judge certification stays in scoring, tally work is dashboard/certification centered, auditor guidance now describes one certification flow with a legacy-label note, emcee guidance no longer implies template-management authority, and contestant results remain explicitly conditional.
- Updated dashboard greetings, descriptions, and quick-action labels so they better reflect role reality, including a dedicated SUPER_ADMIN experience and less misleading results/auditor/board language.
- Aligned AuditorPage button text and subtitle with the revised auditor model.
- Added small tenant-aware coherence improvements to forgot-password and invite-registration guidance while leaving broader unauthenticated surface work in TASK-46.10.

Follow-up boundary:
- Shared shell/navigation terminology such as global route labels remains in TASK-46.9; this task stayed focused on onboarding and direct role guidance surfaces.

Verification:
- npx eslint frontend/src/components/CommandPaletteOnboarding.tsx frontend/src/pages/DashboardPage.tsx frontend/src/pages/AuditorPage.tsx frontend/src/pages/ForgotPasswordPage.tsx frontend/src/pages/RegisterPage.tsx
- cd frontend && npm run type-check
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
