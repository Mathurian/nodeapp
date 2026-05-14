---
id: TASK-46.2
title: >-
  Revalidate and rewrite role-specific onboarding and user guidance across all
  roles
status: To Do
assignee: []
created_date: '2026-05-14 00:03'
updated_date: '2026-05-14 04:50'
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
- [ ] #1 Every role exposed through the welcome/onboarding guidance (SUPER_ADMIN, ADMIN, ORGANIZER, BOARD, JUDGE, TALLY_MASTER, AUDITOR, EMCEE, CONTESTANT) is reviewed line by line against current shipped behavior.
- [ ] #2 Role guidance is rewritten where needed so workflow descriptions, feature labels, certification expectations, and results visibility statements match the actual product behavior and route structure.
- [ ] #3 Related public/auth guidance surfaces such as login, password recovery, and help entry text are checked for coherence with the revised role guidance.
- [ ] #4 Any unresolved wording or product-intent ambiguities discovered during the rewrite are documented explicitly for review rather than guessed at.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Resolved wording decision from TASK-46 audit: auditor-facing guidance should present one auditor certification flow. If the UI still exposes both 'Pending Audits' and 'Final Certification', documentation should explain one underlying workflow and call the alternate title a legacy/alternate label rather than implying two distinct end-user processes.

Seed findings from parent audit: login is tenant-branded and currently links mobile install instructions into docs/02-GETTING-STARTED, while forgot-password and invite-registration pages are comparatively generic/unbranded. Rewrite work should treat login, recovery, registration, help entry, and onboarding as one coherent user-guidance surface rather than isolated pages.

Dashboard quick actions also need wording review, not just welcome cards. Examples: judge and contestant dashboards advertise 'View Results' even though results access is conditional; auditor uses generic /dashboard plus quick links into audit/certification flows rather than a standalone auditor home route. Rewrite should avoid promising availability where access depends on visibility or publication state.

Public auth/recovery surfaces were reviewed directly. LoginPage is tenant-aware and branded from public settings, while ForgotPasswordPage and RegisterPage remain comparatively generic and lightly guided.

Because that unauthenticated public-surface work is larger than role onboarding copy alone, it has been split into TASK-46.10 rather than being kept implicit inside 46.2.

CommandPaletteOnboarding still uses legacy auditor labels ('Pending Audits' and 'Final Certification') inside the live role welcome guide. That conflicts with the chosen model of one auditor certification flow with a legacy-label note.

Auditor live UI review confirms partial migration: AuditorPendingAuditsPage already uses 'Pending Auditor Certifications', but AuditorPage quick links and the role welcome guide still use older labels like 'Pending Audits'.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
