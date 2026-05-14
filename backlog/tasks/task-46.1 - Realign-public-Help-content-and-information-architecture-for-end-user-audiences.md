---
id: TASK-46.1
title: >-
  Realign public Help content and information architecture for end-user
  audiences
status: To Do
assignee: []
created_date: '2026-05-14 00:03'
updated_date: '2026-05-14 04:49'
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
- [ ] #1 The public Help surface is limited to documentation that is appropriate for unauthenticated or general end-user audiences and no longer relies on install/admin/developer-oriented guides as its primary public content.
- [ ] #2 Published public guides are rewritten or restructured so a non-technical user can understand how to sign in, find role-relevant help, understand results visibility limits, and get support without encountering developer or infrastructure instructions.
- [ ] #3 Any docs that should remain available in-repo but not in public Help are explicitly identified and their publication status is documented.
- [ ] #4 Help home/default guidance and cross-links from login or other public pages align with the new public Help information architecture.
<!-- AC:END -->

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
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
