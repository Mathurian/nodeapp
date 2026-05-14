---
id: TASK-46
title: >-
  Parent audit: deep revalidation of all user-facing documentation and guidance
  surfaces
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 04:32'
updated_date: '2026-05-14 04:50'
labels:
  - documentation
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use this task as the parent audit for a deep, line-by-line revalidation of every documentation and guidance surface exposed to users of any type, including public visitors. The purpose of this task is to inventory those surfaces, compare them against current coded functionality and actual user workflows, assess clarity/cohesion for non-technical users, identify inconsistencies or misleading guidance, and create follow-up implementation tasks for the actual content updates. This parent task should capture findings, decisions, open questions, and spawned remediation tasks rather than serving as the single bucket for all downstream documentation edits.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Inventory every documentation and guidance surface exposed to users, including public pages, in-app Help, onboarding/welcome flows, role-specific explanatory copy, login/recovery guidance, and any other user-facing documentation entry points.
- [ ] #2 Perform a deep, line-by-line review of user-accessible documentation against current coded functionality and shipped workflow behavior for every role and for public users, noting inaccuracies, ambiguity, missing context, and comprehension risks for non-technical users.
- [ ] #3 Document findings in a structured remediation matrix that identifies the affected audience, surface, issue type, current behavior, desired correction, and whether user/product clarification is required before editing.
- [ ] #4 Create follow-up implementation tasks for substantive documentation update clusters discovered during the audit, with each spawned task clearly scoped, justified, and linked back to this parent audit.
- [ ] #5 Record any decisions, unresolved questions, or policy clarifications needed from the user before downstream update tasks proceed, and stop to ask when review confidence is insufficient.
- [ ] #6 Include the API/HTTP request behavior of help/documentation surfaces in the audit and document any unnecessary request volume, caching gaps, or rate-limiting implications.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-inventory every user-facing documentation surface and map each one to its audience, route, source file, and governing code path.\n2. Review each public and role-visible documentation/help/onboarding surface line by line against current coded functionality and real workflow behavior, prioritizing correctness, cohesion, and non-technical clarity.\n3. Build a remediation matrix from the findings, grouping issues into coherent update clusters rather than mixing unrelated doc fixes together.\n4. Spawn follow-up backlog tasks for each substantive documentation/update cluster, and capture any user clarification questions immediately when intent or usability standards are uncertain.\n5. After the audit matrix and child tasks are complete, keep this parent task focused on audit completeness, findings quality, and explicit next actions rather than bulk content editing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Inventory and audit findings so far: repository documentation currently spans public help, root product guides, operational/runbook docs, testing guides, internal operations notes, onboarding modal copy, login/help guidance, and tenant-branded public surfaces. The in-app Help page currently loads one branding request plus /api/docs index and /api/docs/<doc> content on document pages; search is local client-side filtering and does not call /api/docs/search during normal page views. The docs backend caches metadata but still reads doc content per request. Rate-limit risk appears low because the page does not poll, but the help surface had two quality gaps: tenant branding was loaded through a generic theme path instead of tenant-aware public settings, and the public docs policy exposed technical references (architecture/API/database/frontend/security) to unauthenticated visitors. Content mismatches found: judge onboarding/help copy implied a shared certifications page even though judge certification happens in scoring; auditor onboarding copy overstated a separate auditor dashboard route; contestant and emcee results guidance was broader than the current conditional published-scope behavior; core docs also described judge certification and results access too broadly.

Implemented in this pass: tightened published Help policy so unauthenticated /help no longer exposes architecture/API/database/frontend/security docs; updated HelpPage branding lookup to use tenant-aware public settings; refreshed role welcome guide copy for judge, auditor, and contestant accuracy; refreshed core docs to clarify that judge certification happens in scoring, emcee/contestant results visibility is conditional, and shared /certifications is not the judge workflow. Remaining gaps / recommended follow-up scope: 1) a deeper repo-wide freshness sweep for operational and testing guides is still warranted because those materials are extensive and not all were validated line-by-line in this pass; 2) operator-focused guides such as 15-STRUCTURE-REUSE-GUIDE may deserve promotion into the authenticated Help surface once their intended audience/publishing policy is confirmed; 3) Help page request volume is modest today (branding + docs index + selected doc, no polling, local search), so no immediate rate-limit mitigation is required, but a future consolidation of branding/docs bootstrap data could remove one extra request if this surface grows further.

Product decision confirmed: operator-facing guides such as 15-STRUCTURE-REUSE-GUIDE should remain repo-only for now and be tracked as a follow-up publishing decision rather than promoted into authenticated in-app Help during this pass.

Spawned remediation tasks from current findings: TASK-46.1 for public Help information architecture and end-user suitability; TASK-46.2 for role-specific onboarding and user guidance across all roles; TASK-46.3 for authenticated admin/operator documentation accuracy and cohesion. Current audit matrix themes: public docs are still mis-curated toward install/ops content; role welcome guidance requires a full all-role revalidation rather than isolated fixes; authenticated admin/operator docs need a deeper route/role/workflow sweep to ensure certification, results, and operational authority statements remain accurate across documents.

Additional concrete findings from the line-by-line pass: docs/02-GETTING-STARTED is still heavily install/admin oriented despite being part of the published public Help set, and it contains stale UI guidance such as 'Navigate to Contestants' plus judge-certification language that no longer matches the live scoring sign-off flow. docs/10-TROUBLESHOOTING is likewise developer/operator heavy for a public Help surface (proxy, nginx, PostgreSQL, ClamAV, WebSocket emission guidance). In the role welcome guide, TALLY_MASTER currently advertises 'Reports' even though the visible tally workspace centers on dashboard/certification/governance rather than a dedicated reports route, and EMCEE messaging needs a permission-sensitive rewrite because script management is not available to pure EMCEE users while admin/organizer/board variants can manage scripts. These examples strengthen the need for TASK-46.1 and TASK-46.2 rather than isolated copy tweaks.

Product decision: do not keep a manually synchronized detailed role/resource permission matrix in user-facing docs. Documentation should provide a simplified high-level role summary and direct admins to the live Permissions page as the authoritative detail surface, with scope-aware caveats where relevant.

Structured remediation matrix snapshot: public visitors + unauthenticated operators | Surface: docs/02-GETTING-STARTED and login-page install-help link | Issue: audience mismatch | Current: public Help exposes installation, local setup, env vars, database setup, and production steps as the main getting-started guide, and login links into it for mobile install help | Desired: split end-user mobile/PWA help from operator/deployment setup content and keep the public/login-linked version strictly nontechnical | Clarification: no, covered by TASK-46.1.

Structured remediation matrix snapshot: public visitors | Surface: docs/10-TROUBLESHOOTING | Issue: audience mismatch / comprehension risk | Current: public Help includes proxy, PostgreSQL, Prisma, ClamAV, and WebSocket/operator troubleshooting that average users cannot act on | Desired: curate public troubleshooting around sign-in, MFA, browser, connectivity, and common user workflow issues; keep operator/developer troubleshooting authenticated or repo-only | Clarification: no, covered by TASK-46.1.

Structured remediation matrix snapshot: all authenticated users by role | Surface: frontend/src/components/CommandPaletteOnboarding.tsx | Issue: role guidance accuracy | Current: some role cards remain broader or more confusing than actual accessible pages and capabilities, especially TALLY_MASTER reports emphasis, EMCEE script-management wording, and AUDITOR naming consistency | Desired: rewrite each role card against real route/capability exposure and reduce jargon where actions are conditional or staged | Clarification: yes for auditor wording, covered by TASK-46.2.

Structured remediation matrix snapshot: admins/operators | Surface: docs/07-SECURITY, docs/INDEX, docs/README, docs/10-TROUBLESHOOTING references | Issue: stale authority model | Current: docs still present a static permission matrix and cross-reference it as authoritative even though permissions are dynamic and scope-aware | Desired: replace with a high-level role-family summary, briefly explain hard gates vs dynamic permissions, and direct admins to the live Permissions page as authority | Clarification: resolved by product decision for option 1, covered by TASK-46.4.

Structured remediation matrix snapshot: admins/operators/public Help consumers | Surface: docs/INDEX and docs/README | Issue: publication-scope mismatch | Current: discovery docs still describe the corpus as if technical/security/deployment content is part of the default Help experience and still point readers to the security guide permission matrix as a core path | Desired: distinguish public Help, authenticated Help, and repo-only material clearly | Clarification: no, covered by TASK-46.1 and TASK-46.4.

Open clarification required before rewriting auditor-facing guidance confidently: the product currently exposes both /auditor/pending-audits and /auditor/final-certification as separate pages, but both render the same auditor-queue certification workspace with different titles and certify labels. Documentation cannot cleanly explain whether these are intentionally distinct workflows or duplicate/legacy labels without product direction.

Product clarification resolved: document auditor work as a single auditor certification flow, and note the legacy alternate title where needed instead of presenting Pending Audits and Final Certification as separate end-user workflows.

Additional deep-audit findings from authenticated/admin/operator and broad product guides: docs/03-FEATURES.md is materially overstating role capabilities in several places versus the live route/access model. Confirmed examples: ADMIN is described as having database browser access even though /database is SUPER_ADMIN-only; BOARD is described as having audit-log access even though the general activity log is admin-only; EMCEE is described as able to manage script templates and print announcements even though pure EMCEE users can access /emcee but script management is reserved to ADMIN/SUPER_ADMIN/ORGANIZER/BOARD in the live page logic. This is large enough to justify dedicated follow-up TASK-46.5 rather than folding into onboarding copy alone.

Additional authenticated-doc findings: docs/14-ADVANCED-FEATURES.md still contains stale product-state claims, including a branding note that the public landing page uses the default tenant branding baseline even though public settings are now tenant-aware, and a UI route claim for /search even though there is no corresponding frontend app route/page in the current tenant router. These findings stay within TASK-46.3 because they affect admin/operator-facing technical feature docs rather than public help or onboarding.

Spawned remediation task TASK-46.5 for the broad role/capability rewrite across product guides such as docs/03-FEATURES.md. Current parent-task split is now: TASK-46.1 public Help IA and end-user suitability; TASK-46.2 onboarding/login/help role guidance; TASK-46.3 authenticated admin/operator docs and advanced feature accuracy; TASK-46.4 dynamic-permissions-aware security guidance; TASK-46.5 core role/capability product-guide rewrite.

Additional audit cluster identified: docs/testing guides are user-facing operator documentation and include stale product assertions. Confirmed examples: Acceptance-Test-Guide-v2 says login/help should link back to / even though tenant-aware public/auth flows use tenant-prefixed base paths; it expects auditors to land on an auditor workspace even though /auditor redirects to /dashboard; these guides also function as product-behavior authorities for human/AI testers, so stale assertions will produce false failures or missed regressions. This justifies a dedicated follow-up task rather than folding into general help or feature docs.

Auth/recovery/public-entry audit findings: Login is tenant-branded and links mobile install help into docs/02-GETTING-STARTED, which reinforces the public-Help IA problem already tracked in TASK-46.1. Forgot-password and invite-registration pages remain functional but visually generic/unbranded compared with login/help/public landing, so the user-facing guidance and identity surface is inconsistent across public auth entry points. This does not justify a separate child task yet; fold it into TASK-46.2 unless later findings show a larger public-auth rewrite is needed.

Repo-only operator-guide pass: docs/15-STRUCTURE-REUSE-GUIDE appears substantially aligned on a first audit slice and does not currently justify a new remediation task beyond its already-recorded repo-only publication decision. In contrast, docs/11-DISASTER-RECOVERY appears to over-describe DR management and backup-target capabilities relative to the current UI/runtime surface. It references 'Admin -> DR Management', detailed backup-target configuration types, and /api/dr/test-style flows, while the current frontend disaster-recovery page is narrower and the live route label is /disaster-recovery. Keep this under TASK-46.3 for now as an authenticated admin/operator accuracy problem rather than creating another child task prematurely.

Additional IA finding from the published-doc policy: docsAccessPolicy still groups some restricted technical/admin references under end-user-oriented taxonomy. Example: 01-ARCHITECTURE is published into the 'getting-started' section even though it is ADMIN/SUPER_ADMIN-only, and 02-GETTING-STARTED is described as a quick-start guide for new users despite its current install/setup/deployment-heavy content. This is a Help taxonomy/metadata problem separate from the document rewrites themselves, so it justifies a dedicated follow-up task.

Technical-reference sweep findings: docs/01-ARCHITECTURE repeats the stale static-permissions authority pattern by pointing readers to a permission matrix in middleware, and docs/06-FRONTEND lists a shared /search page that is not present in the current frontend router. These do not require new child tasks beyond TASK-46.3 and TASK-46.4, but they confirm that restricted technical docs need the same line-by-line scrutiny as public help and role guides.

Current alignment snapshot from repo-only / restricted docs: docs/08-DEPLOYMENT.md, docs/operations/DEV-TO-PROD-DEPLOY-QUICK.md, and docs/15-STRUCTURE-REUSE-GUIDE.md appear substantially aligned on this audit slice and do not currently justify new remediation tasks. docs/05-DATABASE.md also did not surface an obvious user-facing accuracy problem in the sections reviewed. In contrast, docs/09-DEVELOPMENT and docs/12-WORKFLOW-CUSTOMIZATION still contain behavior/examples that drift from the live app and should remain in TASK-46.3 scope.

Role-landing audit findings: onboarding/help docs need to respect actual post-login routing and dashboard behavior, not just page availability. The live app gives dedicated default home routes only to TALLY_MASTER, EMCEE, and BOARD; other roles land on /dashboard and rely on quick actions. Existing or future user-facing guidance that implies a dedicated auditor landing workspace would be misleading unless framed as a navigable workflow rather than a default home route.

Testing-doc alignment snapshot: the strongest drift is in the markdown runbooks and human-facing expectations, not the machine-readable Acceptance-Test-Cases exports reviewed so far. Keep TASK-46.6 centered on narrative guidance, routing/role expectation cleanup, and cross-guide coherence unless later audit slices uncover stale case IDs or invalid machine assertions.

New guidance-surface cluster identified: inline access and recovery states are inconsistent enough to justify their own follow-up task. Examples from the audit slice: ProtectedRoute uses a generic access-denied page with no tenant-aware help or role-specific next step; EmceePage says 'You must be an emcee' even though ADMIN/SUPER_ADMIN/ORGANIZER/BOARD can also access /emcee; BiosPage uses a softer restricted-state card; ResultsPage uses conditional detailed-results wording. This is not just styling drift, it is user-guidance drift that affects comprehension when permissions or routing block the user.

Public entry-surface snapshot from this pass: default public landing content in frontend/src/types/publicLandingContent.ts reads relatively restrained and audience-appropriate on first review; it does not currently present the same overclaiming or technical-audience mismatch seen in public Help docs. The remaining public-surface concerns are refinement issues already captured elsewhere: login still routes mobile install help into the overly technical 02-GETTING-STARTED guide (TASK-46.1/46.2), and HelpPage's default fallback copy will likely need review only after Help taxonomy/content are reworked. No new child task is justified from this slice.

Help entry-point coherence finding: frontend/src/components/Layout.tsx currently links the authenticated top-bar Help button to plain /help instead of a tenant-aware Help path. Even if content is corrected, Help discoverability/routing will still be inconsistent until entry points use the same tenant-aware model as login/help pages.

Workflow-page copy snapshot: live page headers/subtitles for Certifications, Score Governance, Winners, and Deductions are generally more accurate than the stale markdown guides and did not justify a new child task in this slice. The notable exception remains the disaster-recovery surface, whose page copy ('Manage disaster recovery plans and failover procedures', 'Create DR Plan') reinforces the broader DR-management model already flagged under TASK-46.3 and docs/11-DISASTER-RECOVERY. Board certifications wording is generic ('Certifications') but not currently misleading enough on its own to split out another task.

New in-app terminology cluster identified: navigationConfig labels are reused directly by the command palette (via navigationCommands), while dashboard quick actions and Layout route labels define overlapping wording independently. Confirmed risks from this slice: 'Judge Scoring' is visible beyond judges, 'View Results' appears in surfaces where availability is conditional, and auditor/legacy labels such as 'Final Certification' or 'Score Verification' can leak through route labels even after the product decision to document one auditor certification flow. This justifies a dedicated follow-up task for shell terminology alignment.

Admin-facing in-app guidance snapshot: WorkflowManagementPage, TestEventSetupPage, and RateLimitConfigPage did not justify another standalone remediation cluster in this slice. Test Event Setup is clear about being development/testing only, Rate Limit Configuration is explicit about SUPER_ADMIN scope, and Workflow Management appears broadly consistent with a step-based/manual workflow model even though its copy should still be reviewed alongside docs/12-WORKFLOW-CUSTOMIZATION. The disaster-recovery page remains the strongest admin-facing in-app outlier and stays under TASK-46.3.

SettingsPage review: admin-facing settings copy is now a real user-guidance surface for public landing, invite-only registration, contestant visibility, published-results role visibility, and tenant-vs-event release behavior.

Confirmed SettingsPage teaches relative public-landing URL behavior, invite-only registration, contestant-only visibility toggles, and tenant-default published-results role visibility; EventsPage adds event-level override and release-gating copy.

Current docs barely explain this settings model. docs/03-FEATURES.md only has a short visibility note, which is not enough for admin/operator guidance.

Created TASK-46.11 to handle admin-facing public/results visibility guidance across Settings, Events, and related docs as a coherent update scope.

Public auth/recovery review: LoginPage is tenant-aware and branded from public settings, but ForgotPasswordPage and RegisterPage remain generic and lightly guided.

Created TASK-46.10 to handle public authentication/recovery/invitation guidance cohesion as a distinct follow-up scope.

Navigation and dashboard review confirms the shell itself is still teaching stale or over-broad concepts before users ever open help docs.

Concrete examples: navigationConfig still labels /scoring as 'Judge Scoring' even though the route is not judge-exclusive; it still exposes 'View Results' as a generic shell label despite results access being conditional by role and publication scope.

Dashboard quick actions reinforce the same drift: Judge and Contestant dashboards advertise 'View Results' as a normal action even though access may be blocked entirely depending on published scope and visibility settings; Auditor quick actions still use the legacy '/auditor/pending-audits' label alongside the single-flow auditor model.

Restricted-state review confirms the inconsistency is not just stylistic; different pages imply different recovery paths and different reasons for denial.

ProtectedRoute still shows a generic Access Denied state with only 'Go Back'. ResultsPage gives a more specific scope-based denial. BiosPage uses a softer yellow restricted card. NotFoundPage is tenant-aware and includes a help-center recovery path, which is materially better than the default denial experience.

EmceePage remains the clearest incorrect example: it tells the user 'You must be an emcee to access this page' even though admin, organizer, and board roles can also legitimately access the route.

Docs index review confirms the taxonomy problem exists both in config and in the repo-facing index pages themselves.

src/config/docsAccessPolicy.ts still classifies 01-ARCHITECTURE.md under 'Getting Started' and still describes 02-GETTING-STARTED.md as a quick start for new users even though the content is installation/setup heavy.

docs/README.md and docs/INDEX.md still advertise testing runbooks, AI UAT materials, architecture, API, and security/developer references as if they are part of a broadly user-facing starting set, even while the newer scope notes say public help is limited to end-user guidance.

docs/INDEX.md still points readers to 'Security Guide - Permission Matrix' for complete CRUD permissions breakdown, which directly conflicts with the approved documentation model of high-level summaries plus the live Permissions page as authority.

Help-page review confirms that public-help remediation is not just about which docs are published; the Help UI copy itself still reflects the older 'comprehensive documentation' model.

HelpPage default landing copy still says the documentation provides 'comprehensive information' about the system and includes generic troubleshooting/support language rather than a clearly public end-user/operator help framing.

Layout still hardcodes the authenticated help affordance to '/help' in a new tab instead of using a tenant-aware help path, so the shell can still route users toward the wrong branded help surface.

Public landing implementation review: PublicLandingPage and publicLandingContent are substantially aligned with the intended tenant-aware, invitation-based public model. No separate child task is needed right now beyond the existing public-surface work.

CommandPaletteOnboarding still contains legacy auditor terminology inside live first-run guidance ('Pending Audits' and 'Final Certification') even though the approved documentation model is a single auditor certification flow with a legacy-label note.

docs/02-GETTING-STARTED.md remains fundamentally an install/setup/developer document while still being published as public getting-started content. It is not an end-user/operator quick start in its current form.

docs/10-TROUBLESHOOTING.md is likewise heavily technical and still tells readers to check the permissions matrix in documentation, which conflicts with the approved permissions-doc model and is inappropriate for a narrow public-help surface.

UAT-guide review confirmed the drift is mostly in narrative assumptions about default landing routes and role-specific workspace naming, not just in low-level test IDs.

Acceptance-Test-Guide-v2.md still expects auditors to land on an auditor workspace with pending-audits quick links, which conflicts with the current routing model where auditors land on /dashboard and the product intent is one auditor certification flow with legacy-label notes.

The UAT guides also continue to frame public pages and help with older assumptions, while the live product now has a more tenant-aware but still mixed public auth/help model.

Live auditor/tally/board page review shows the auditor terminology problem is a partial migration in product UI, not only a doc issue.

AuditorPendingAuditsPage already titles itself 'Pending Auditor Certifications', but AuditorPage quick links still expose 'Pending Audits' and 'Certification Status'. CommandPaletteOnboarding still uses the older labels too.

This means the auditor guidance rewrite needs to normalize both route/shell labels and onboarding/docs around a single certification-flow mental model while optionally noting legacy labels where they still appear.

PermissionsPage review: the live permissions surface is technical but broadly suitable to serve as the authoritative admin reference, which supports the chosen documentation model of simplified docs plus live Permissions page detail.

The page already explains resource scope, resource:operation pairs, and change confirmation with audit reasons. This is materially more trustworthy than a static markdown matrix, even though the wording could still be refined for non-technical admins later.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
