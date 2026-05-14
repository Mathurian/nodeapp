---
id: TASK-46.1
title: >-
  Realign public Help content and information architecture for end-user
  audiences
status: Done
assignee:
  - '@codex'
created_date: '2026-05-14 00:03'
updated_date: '2026-05-14 17:40'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Rework the public-facing Help surface so it is actually suitable for public and non-technical end users. The current published set still leans heavily toward installation, setup, and operational content even after technical references were removed from public access. This task should audit the remaining public docs (especially Getting Started, Features, Troubleshooting, and Help home guidance), decide what belongs in public Help versus repo-only/admin-only docs, and rewrite or relocate content so the public Help experience is coherent, role-appropriate, and understandable to average users.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The public Help surface is limited to documentation that is appropriate for unauthenticated or general end-user audiences and no longer relies on install/admin/developer-oriented guides as its primary public content.
- [x] #2 Published public guides are rewritten or restructured so a non-technical user can understand how to sign in, find role-relevant help, understand results visibility limits, and get support without encountering developer or infrastructure instructions.
- [x] #3 Any docs that should remain available in-repo but not in public Help are explicitly identified and their publication status is documented.
- [x] #4 Help home/default guidance and cross-links from login or other public pages align with the new public Help information architecture.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the current public Help publishing set with a curated end-user/operator set by updating the docs access policy and any related section metadata so unauthenticated Help no longer centers install, deployment, API, or implementation material.
2. Rewrite the public-facing Help landing surfaces and index documents (HelpPage default state, docs/README.md, docs/INDEX.md, and any linked public guides) so they introduce the app in non-technical terms, explain where to get role-relevant help, and remove implementation-plan and developer/testing navigation from public discovery paths.
3. Restructure or replace the currently published public guides that are still technical-first, especially docs/02-GETTING-STARTED.md and docs/10-TROUBLESHOOTING.md, so they become true end-user/operator help rather than setup or infrastructure references.
4. Fix Help entry-point cohesion by making authenticated/public Help links and default cross-links use the correct tenant-aware destinations and match the new public Help information architecture.
5. Run focused verification on docs-policy behavior plus frontend build/lint checks, then update the task notes with the exact publication decisions and any repo-only docs that remain intentionally unpublished.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Seed refinement note from parent audit: once public Help taxonomy/content is reworked, revisit the default HelpPage home/fallback copy so it introduces the published help set in audience-appropriate terms and does not inherit assumptions from the old 'comprehensive documentation' model.

Help entry-point finding from parent audit: the authenticated shell help button in frontend/src/components/Layout.tsx still hardcodes href='/help' and opens a new tab, rather than using tenant-aware help routing like other public/auth surfaces. This is a Help-surface coherence issue and should be addressed alongside public/auth Help IA cleanup.

HelpPage default landing state still describes the docs as a comprehensive documentation set and uses generic support/troubleshooting framing, which does not match the intended narrower public-help audience.

The unauthenticated Help landing also says the sidebar shows every document published for public access; that wording should be revisited once the curated public-help set is rewritten around end-user/operator guides.

Layout still opens help via a hardcoded '/help' link in a new tab instead of a tenant-aware help destination, so public/help branding cohesion is still incomplete even after the earlier publication-scope fixes.

PublicLandingPage itself is mostly aligned with the current invitation-based tenant-aware model; the larger drift remains in the published help docs and surrounding auth/help surfaces rather than the landing renderer.

docs/02-GETTING-STARTED.md is still an installation/setup guide for developers/operators, not a public end-user getting-started guide. It should not be treated as suitable public-help copy without major restructuring or replacement.

docs/10-TROUBLESHOOTING.md is still dominated by installation, database, JWT, CSRF, and deployment/debug guidance and does not read like an end-user/operator public help article set.

Published Help taxonomy/sectioning has been split back out as TASK-46.12 so the content rewrite and the section-policy/index rewrite remain independently trackable.

Public Help IA findings are now more exact: HelpPage still introduces the surface as a comprehensive documentation library, while docs/README.md and docs/INDEX.md continue to present testing, architecture, API, database, security, and developer references as the main navigation experience. This undermines the intended public-help posture of end-user/operator guidance only, even before individual doc content is rewritten.

Line-level public-help findings from remaining root docs: docs/02-GETTING-STARTED.md is still fundamentally an installation/deployment/developer setup guide, including repository cloning, .env secrets, PostgreSQL setup, Prisma generation, and production build guidance. It is not a true end-user/operator quick start despite its public-help positioning. docs/10-TROUBLESHOOTING.md is similarly technical-first, covering npm cache cleanup, Prisma generation, PostgreSQL operations, bearer-token debugging, and permission-matrix references. These are not narrow public-help materials in their current form.

Additional public/help-scope leak: docs/README.md and docs/INDEX.md still surface CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md as if it were part of normal user/operator navigation. That document reads as an implementation spec, not user-facing guidance, and should not remain prominently surfaced in help/discovery paths even if the underlying shipped operator workflow is documented separately in 15-STRUCTURE-REUSE-GUIDE.md.

- Reworked the public Help surface around a narrow public guide set instead of the old broad documentation-library posture.
- Moved 03-FEATURES.md out of public access by making it admin-restricted in the docs access policy, leaving public Help focused on end-user/operator-safe guidance while broader capability docs stay for later rewrite under TASK-46.5.
- Rewrote docs/02-GETTING-STARTED.md into a true end-user guide covering sign-in, role-based visibility, results timing, mobile install, and escalation paths.
- Rewrote docs/10-TROUBLESHOOTING.md into an end-user/operator issue guide and removed installation, database, JWT, Prisma, and infrastructure-debug content from the public-facing article.
- Rewrote docs/README.md and docs/INDEX.md to clearly separate published public Help from repo-only or restricted references, explicitly calling out implementation-plan material like CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md as repo-only.
- Updated frontend/src/pages/HelpPage.tsx home copy and sidebar/support language so public visitors see a Help-center framing instead of a comprehensive documentation-library framing.
- Updated frontend/src/components/Layout.tsx and frontend/src/lib/commands/definitions/actionCommands.ts so Help entry points open tenant-aware Help routes rather than a hardcoded /help URL.
- Verification passed: npx eslint frontend/src/pages/HelpPage.tsx frontend/src/components/Layout.tsx frontend/src/lib/commands/definitions/actionCommands.ts; cd frontend && npm run type-check; cd frontend && npm run build; npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Realigned the public Help surface around a small, end-user-safe guide set instead of the old comprehensive documentation library model.

What changed:
- Restricted public Help publication to the rewritten public guides by making 03-FEATURES.md admin-only in the docs access policy until the broader capability guide is corrected in TASK-46.5.
- Rewrote the public-facing Getting Started and Troubleshooting guides so they explain sign-in, role-based visibility, results timing, mobile installation, common app issues, and when to escalate without exposing install/deployment/developer instructions.
- Reworked docs/README.md and docs/INDEX.md so they clearly distinguish public Help from repo-only or restricted references, including implementation-plan material that should no longer read like normal Help navigation.
- Updated the HelpPage home state and support copy to present the surface as a Help center, not a comprehensive technical documentation library.
- Fixed authenticated Help entry points in the app shell and command palette to use tenant-aware Help routes instead of hardcoded /help links.

Verification:
- npx eslint frontend/src/pages/HelpPage.tsx frontend/src/components/Layout.tsx frontend/src/lib/commands/definitions/actionCommands.ts
- cd frontend && npm run type-check
- cd frontend && npm run build
- npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
