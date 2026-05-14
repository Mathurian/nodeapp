---
id: TASK-46
title: >-
  Parent audit: deep revalidation of all user-facing documentation and guidance
  surfaces
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 04:32'
updated_date: '2026-05-14 14:41'
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
- [x] #1 Inventory every documentation and guidance surface exposed to users, including public pages, in-app Help, onboarding/welcome flows, role-specific explanatory copy, login/recovery guidance, and any other user-facing documentation entry points.
- [x] #2 Perform a deep, line-by-line review of user-accessible documentation against current coded functionality and shipped workflow behavior for every role and for public users, noting inaccuracies, ambiguity, missing context, and comprehension risks for non-technical users.
- [x] #3 Document findings in a structured remediation matrix that identifies the affected audience, surface, issue type, current behavior, desired correction, and whether user/product clarification is required before editing.
- [x] #4 Create follow-up implementation tasks for substantive documentation update clusters discovered during the audit, with each spawned task clearly scoped, justified, and linked back to this parent audit.
- [x] #5 Record any decisions, unresolved questions, or policy clarifications needed from the user before downstream update tasks proceed, and stop to ask when review confidence is insufficient.
- [x] #6 Include the API/HTTP request behavior of help/documentation surfaces in the audit and document any unnecessary request volume, caching gaps, or rate-limiting implications.
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

Broad-guide review confirmed that docs/03-FEATURES.md still contains multiple live-product mismatches beyond the ones already logged.

Confirmed examples: ADMIN is still documented with database browser access; BOARD is documented with audit-log access; EMCEE is documented as managing script templates and printing announcements; User Creation still lists self-registration if enabled even though the product is invite-only; JUDGE guidance still implies request-edit style behavior rather than the current governance/remediation framing.

docs/07-SECURITY.md is still built around a static role hierarchy and static CRUD permission matrix, which directly conflicts with the approved documentation model and with the current scope-aware permissions system.

docs/01-ARCHITECTURE.md remains mostly technical/reference material, but as a published item it still contributes to the wrong public-help shape and should not be treated as a getting-started surface.

Standalone Help taxonomy task was missing from the current backlog listing despite earlier audit references. Re-created that scope as TASK-46.12 so the public-vs-restricted sectioning work is tracked explicitly.

Authenticated technical-guide review produced more concrete stale claims. docs/14-ADVANCED-FEATURES.md still advertises a global search page at /search and still says the public landing page uses a default-tenant branding baseline. docs/06-FRONTEND.md still lists /search as a core shared page and still claims AUDITOR defaults to /auditor rather than /dashboard.

docs/12-WORKFLOW-CUSTOMIZATION.md still uses 'Admin -> Workflows -> Dashboard' wording as if it were a distinct surfaced route and remains overly generic relative to the current workflow product surface.

docs/09-DEVELOPMENT.md still models API auth with bearer-token examples and older generic route expectations, which needs a freshness pass for current tenant-aware routing and cookie-based browser auth behavior.

Reviewed the remaining published/admin-oriented guides for this slice. docs/11-DISASTER-RECOVERY.md still overstates the live feature surface with language like 'comprehensive DR automation features', explicit DR management/configuration JSON, target types, RTO/RPO configuration, and failover-test APIs that are not clearly represented in the current product UX/runtime.

By contrast, docs/15-STRUCTURE-REUSE-GUIDE.md remains substantially aligned on first-pass review and does not currently justify its own remediation task.

The testing handoff/lifecycle references also look comparatively healthy in this slice: AI-UAT-Handoff-Template.md and E2E-Lifecycle-Track.md are much closer to current lifecycle behavior than the broader human UAT narrative guides.

API/deployment reference review looks comparatively healthy. docs/04-API-REFERENCE.md and docs/08-DEPLOYMENT.md appear substantially aligned on first-pass review and do not currently justify separate remediation tasks.

Disaster recovery concern is now narrower than initially suspected: the /dr route group, controller, and UI page do exist. The remaining risk is that docs/11-DISASTER-RECOVERY.md may still overstate polish or operability, not that the entire surface is fictional.

Lower-risk reference review: docs/05-DATABASE.md and docs/testing/testing-guide.md appear comparatively stable on first-pass review and do not currently justify separate remediation tasks.

docs/operations/DEPLOYMENT-GUIDE.md is more mixed: it correctly acknowledges systemd and the release-directory runtime, but still carries older framing such as phase-based feature rollout language and optional PM2/Kubernetes guidance that may no longer match the intended operator path.

Communication-surface review shows a distinct documentation/guidance cluster rather than isolated stale wording. The live product splits communication behavior across personal Notifications, reusable Email Templates, Send Email/Bulk Operations, and Email / SMTP Settings, but the docs do not currently teach that model coherently.

Concrete findings: docs/13-ADMIN-GUIDE documents SMTP sender and reply-to behavior but does not explain the relationship between SMTP settings, template sends, bulk email, and user notification preferences. docs/14-ADVANCED-FEATURES reduces the feature to "Email Templates and Sending" at /email-templates and omits the separate Send Email/Bulk Operations surface. navigationConfig exposes a Communication section with Send Email, Email Templates, and Emcee Dashboard, while Notifications remains under generic Navigation, which further fragments the mental model.

Route/source mismatches were also confirmed: emailTemplateRoutes comments still describe multiple endpoints as "Admin/Organizer only" even though TEMPLATE_ADMIN_ROLES includes SUPER_ADMIN and BOARD; EmailTemplatesPage and BulkOperationsPage both gate access for SUPER_ADMIN/ADMIN/ORGANIZER/BOARD; NotificationsPage is an all-role personal inbox/preferences surface. Created child task TASK-46.13 to handle communications/email/notification guidance as its own remediation scope.

Additional line-level findings: RegisterPage correctly enforces the invite-only model but remains generic and lightly guided compared with the tenant-aware login surface. ForgotPasswordPage is likewise generic and minimally contextual. CommandPaletteOnboarding still contains exact role drift: TALLY_MASTER overstates Reports as a primary workspace, and AUDITOR still teaches Pending Audits and Final Certification as separate destinations instead of the approved single-flow auditor model with a legacy-label note.

Visibility-settings review confirms that SettingsPage and EventsPage are now first-class guidance surfaces for admin/operator users. The UI explains invite-only registration, tenant-branded welcome emails, contestant winners/overall/minimum-score visibility, tenant-level published-results role defaults, event-level contestant release dates, and per-event published-results overrides. docs/03-FEATURES.md only mirrors this with very short release/visibility notes, so TASK-46.11 remains a necessary update cluster.

Restricted-access review is now concrete enough to support execution work. Current states range from generic deny-and-back (ProtectedRoute), to softer restricted cards (BiosPage), to scope-specific explanatory denial (ResultsPage), to tenant-aware recovery with dashboard/help fallback and cache reset (NotFoundPage). EmceePage still contains the clearest incorrect wording by telling users they must be an emcee even though several admin/governance roles are also valid for that route.

Shell terminology review confirms that stale wording is replicated across navigation, quick actions, onboarding, and command search from shared sources. Current concrete examples: /scoring is still labeled Judge Scoring, /results is still surfaced as View Results even for roles with conditional access, auditor quick actions still point to /auditor/pending-audits, and command search inherits those same labels from navigationConfig.

Help-taxonomy review confirms the issue is structural, not just content-level. docsAccessPolicy still organizes the published set around technical/deployment categories and even places Architecture under Getting Started. docs/README.md and docs/INDEX.md still foreground testing and technical references. HelpPage landing copy still promises comprehensive system documentation, which conflicts with the intended curated public-help model.

Permissions/security review is now line-level. docs/07-SECURITY.md still contains a static role hierarchy and static CRUD permission matrix, while docs/01-ARCHITECTURE.md, docs/10-TROUBLESHOOTING.md, docs/README.md, and docs/INDEX.md still point readers toward that matrix as authoritative. This directly conflicts with the approved documentation model of simplified role summaries plus the live Permissions page as the authoritative admin reference.

Disaster-recovery findings were narrowed again: the concern is no longer that docs/11-DISASTER-RECOVERY.md describes a nonexistent feature surface. The live UI/controller do support DR plans, RTO/RPO, test execution, and failover actions. The remaining remediation need is wording/operability alignment so docs do not imply a more mature or differently structured DR console than the current admin-only page actually provides.

Remaining root-doc/UAT pass confirms the current child-task split is still correct. Public-help scope remains wrong in docs/02-GETTING-STARTED.md and docs/10-TROUBLESHOOTING.md. Authenticated technical docs still contain exact drift in docs/06-FRONTEND.md, docs/09-DEVELOPMENT.md, and docs/14-ADVANCED-FEATURES.md. Workflow docs still use unsupported generic roles and route labels in docs/12-WORKFLOW-CUSTOMIZATION.md. Human UAT guidance still carries tenant-branding and auditor-workspace assumptions that no longer match the product.

Low-risk verification pass: docs/15-STRUCTURE-REUSE-GUIDE.md still looks materially aligned with the shipped clone/template flows and role scope. docs/04-API-REFERENCE.md remains comparatively healthy as a route-group reference and already reflects cookie-primary auth plus bearer-token support for API clients. docs/05-DATABASE.md still reads as technical reference rather than user help, but it did not surface obvious correctness drift in the reviewed sections. docs/08-DEPLOYMENT.md remains one of the stronger documents and appears aligned with the current release-based production runtime.

Additional docs/03-FEATURES risk: beyond role/access drift, the guide still contains several feature-level claims that appear stronger than the live UI supports, including bulk score entry, score templates, calculator integration, public feedback/private judge-note language, self-registration, and emcee print-announcement capability. These need explicit narrowing during TASK-46.5 rather than simple wording cleanup.

Coverage/mapping checkpoint: root docs 01-15, README.md, INDEX.md, public/auth/help surfaces, onboarding, navigation shell copy, settings/results visibility guidance, communications guidance, and the testing runbooks have now all been reviewed at least once against live code/workflow behavior. The current child-task split still appears complete: public Help IA/content (46.1), role onboarding/help (46.2), authenticated admin/operator docs (46.3), permissions/security guidance (46.4), broad role/capability guides (46.5), UAT guides (46.6), access-denied/recovery states (46.8), navigation/command terminology (46.9), public auth/recovery/invitation guidance (46.10), visibility settings guidance (46.11), Help taxonomy (46.12), and communications/email/notification guidance (46.13).

Repo-only materials under docs/operations/internal/, docs/adr/, and plan/proposal documents such as CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md or NPM-REMEDIATION-MATRIX.md are not currently being treated as end-user/public guidance surfaces unless they are surfaced or cross-linked into user-visible help paths. The remaining work under TASK-46 is therefore audit completion and matrix cleanup, not broad new-surface discovery.

Additional scope-discovery finding: CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md is still surfaced from docs/README.md and docs/INDEX.md even though it reads like an implementation spec rather than user-facing guidance. This does not require a new child task; it fits the existing Help IA/taxonomy cleanup under TASK-46.1 and TASK-46.12.

File-to-task coverage snapshot:
- docs/README.md, docs/INDEX.md -> TASK-46.1 + TASK-46.12 (public Help IA/taxonomy, plus stray implementation-doc links)
- docs/01-ARCHITECTURE.md -> TASK-46.12 + TASK-46.4 (published taxonomy mismatch and static permission-matrix references)
- docs/02-GETTING-STARTED.md -> TASK-46.1
- docs/03-FEATURES.md -> TASK-46.5, with visibility/settings spillover into TASK-46.11
- docs/04-API-REFERENCE.md -> reviewed as comparatively low-risk; normal freshness maintenance only
- docs/05-DATABASE.md -> reviewed as comparatively low-risk technical reference
- docs/06-FRONTEND.md -> TASK-46.3, with shell/role language overlap into TASK-46.9 where needed
- docs/07-SECURITY.md -> TASK-46.4
- docs/08-DEPLOYMENT.md -> reviewed as comparatively low-risk and aligned with current runtime
- docs/09-DEVELOPMENT.md -> TASK-46.3
- docs/10-TROUBLESHOOTING.md -> TASK-46.1 + TASK-46.4, with technical-auth/operator drift also noted under TASK-46.3
- docs/11-DISASTER-RECOVERY.md -> TASK-46.3
- docs/12-WORKFLOW-CUSTOMIZATION.md -> TASK-46.3 + TASK-46.5
- docs/13-ADMIN-GUIDE.md -> TASK-46.3, with visibility/settings overlap in TASK-46.11 and communications overlap in TASK-46.13
- docs/14-ADVANCED-FEATURES.md -> TASK-46.3 + TASK-46.5 + TASK-46.13
- docs/15-STRUCTURE-REUSE-GUIDE.md -> reviewed as comparatively low-risk; keep repo-only publication decision separate
- docs/testing/Acceptance-Test-Guide-v2.md and docs/testing/Acceptance-Test-Guide.md -> TASK-46.6
- docs/testing/AI-UAT-Handoff-Template.md, Acceptance-Test-Quick-Run.md, E2E-Lifecycle-Track.md -> TASK-46.6 but lower-risk than the main narrative guides
- public/auth/help shell and page surfaces -> TASK-46.1, TASK-46.2, TASK-46.10, TASK-46.12 depending on audience and publication path
- role onboarding/welcome guide -> TASK-46.2
- navigation, dashboard quick actions, command palette labels -> TASK-46.9
- access-denied/restricted/recovery states -> TASK-46.8
- notifications/email/templates/send-email/SMTP guidance -> TASK-46.13

Scope boundary note: repo-only internal/ADR/implementation-plan material is only in TASK-46 when it leaks into user-facing discovery/help paths. Otherwise it remains outside the user-facing rewrite scope.

Final consolidation note: the parent audit has now completed surface coverage, line-level drift capture, child-task spawning, and file-to-task mapping. No additional user-facing documentation cluster currently appears to require a new child task. Remaining work after closing the parent is execution of the spawned rewrite tasks, plus any later re-audit if product behavior changes again.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed the deep parent audit of user-facing documentation and guidance surfaces across public Help, public auth/recovery, onboarding, navigation terminology, restricted/recovery states, admin/operator docs, settings/results-visibility guidance, communications guidance, and UAT runbooks.

Audit outputs:
- Identified and documented the major drift clusters across public Help IA, onboarding, authenticated admin/operator docs, permissions/security guidance, broad role/capability guides, UAT guides, access-denied/recovery states, navigation terminology, public auth/recovery guidance, visibility settings guidance, Help taxonomy, and communications/email/notification guidance.
- Spawned and scoped child tasks TASK-46.1, 46.2, 46.3, 46.4, 46.5, 46.6, 46.8, 46.9, 46.10, 46.11, 46.12, and 46.13 for the actual rewrite work.
- Recorded product decisions needed to keep downstream rewrites defensible, including the public-Help scope, repo-only operator-guide decision, simplified permissions-doc model, and single-flow auditor-certification wording.
- Added an explicit file-to-task mapping and scope-boundary note so implementation work can proceed without re-auditing discovery.

Key conclusions:
- Surface coverage for the audit is complete.
- The current child-task split appears complete; no additional remediation bucket is currently required.
- Lower-risk technical references such as docs/04-API-REFERENCE.md, docs/05-DATABASE.md, docs/08-DEPLOYMENT.md, and docs/15-STRUCTURE-REUSE-GUIDE.md do not currently justify heavy rewrite scope.
- Repo-only/internal/implementation-plan materials remain outside the rewrite scope unless they leak into user-facing discovery/help paths.

Next step after closing this parent task: execute the child tasks as the actual documentation update backlog.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
