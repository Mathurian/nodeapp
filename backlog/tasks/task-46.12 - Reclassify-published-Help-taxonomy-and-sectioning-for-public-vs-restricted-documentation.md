---
id: TASK-46.12
title: >-
  Reclassify published Help taxonomy and sectioning for public vs restricted
  documentation
status: Done
assignee:
  - '@codex'
created_date: '2026-05-14 04:55'
updated_date: '2026-05-14 17:59'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit and update the published Help taxonomy so section labels, ordering, and published index copy match the intended split between public end-user/operator guidance and restricted technical/admin documentation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Inventory the current published Help taxonomy in docs access policy and repo-facing index surfaces, including mismatches between section labels, audience expectations, and actual document content.
- [x] #2 Identify and document places where technical/admin/developer material is still presented as public getting-started or broad user-facing Help content.
- [x] #3 Update the Help taxonomy and related index/landing copy so public Help sectioning clearly reflects end-user/operator guidance while restricted documentation is labeled and grouped appropriately for authenticated admin audiences.
- [x] #4 Verify the resulting taxonomy and descriptions are consistent across the published docs policy, repo-facing index pages, and in-app Help navigation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Rework the published Help section model in src/config/docsAccessPolicy.ts so the top-level taxonomy reflects the actual audience split: public end-user/help-first sections for public docs and clearly labeled restricted sections for authenticated admin/reference material.
2. Update the individual published doc assignments, titles, descriptions, and section ordering so each remaining Help document sits under a section label that matches its audience and content instead of the old technical-library structure.
3. Update frontend/src/pages/HelpPage.tsx section icons and any landing/navigation copy needed so the in-app Help sidebar presents the same taxonomy users see in the repo-facing index docs.
4. Rewrite docs/README.md and docs/INDEX.md as needed so their headings, groupings, and descriptions match the new section model and no longer imply that repo reference material is part of the public Help taxonomy.
5. Run focused verification on the docs policy and Help UI surfaces with lint/type/build checks, then record the final taxonomy decisions and any intentional repo-only boundaries in the task notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Line-level Help-taxonomy findings: docsAccessPolicy still classifies 01-ARCHITECTURE.md under Getting Started and describes 02-GETTING-STARTED.md as a quick start for new users even though the content is install/setup heavy. The published section model itself is still technical-first (Getting Started, Technical Reference, Security & Deployment, Operations, Administration & Advanced) rather than end-user/operator-first. docs/README.md and docs/INDEX.md still foreground AI UAT, testing runbooks, architecture, API, database, security, deployment, and developer materials in their quick links and core-navigation sections even while scope notes say public Help is narrow. HelpPage landing copy still says the documentation provides comprehensive information about the system, which reflects the old broad-library model instead of the newer curated public-help model.

Docs taxonomy/index leak: CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md is still linked from docs/README.md and docs/INDEX.md alongside real operator/help docs. It should be treated as implementation/reference material, not as part of the curated user-facing documentation taxonomy.

- Replaced the old technical-library section model (Getting Started, Technical Reference, Security & Deployment, Operations, Administration & Advanced) with an audience-aware taxonomy: Public Help, Admin & Operator Guides, Technical Reference, and Security, Deployment & Recovery.
- Reassigned published docs in src/config/docsAccessPolicy.ts so public guides (02 and 10) live under Public Help, authenticated admin guidance (03, 12, 13, 14) lives under Admin & Operator Guides, technical references (01, 04, 05, 06, 09) live under Technical Reference, and security/runtime docs (07, 08, 11) live under Security, Deployment & Recovery.
- Updated frontend/src/pages/HelpPage.tsx section icons so the in-app Help sidebar reflects the same taxonomy exposed by the server-side docs policy.
- Reworked docs/README.md and docs/INDEX.md so their headings now mirror the published Help taxonomy instead of mixing public-help navigation with repo-only operations/testing/implementation-plan material.
- Explicitly kept 15-STRUCTURE-REUSE-GUIDE.md, docs/testing/, docs/operations/, and CONTEST-CATEGORY-TEMPLATE-COPY-PLAN.md outside the Help taxonomy as repo-only references.
- Verification passed: npx eslint frontend/src/pages/HelpPage.tsx; cd frontend && npm run type-check; cd frontend && npm run build; npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Reclassified the Help taxonomy so the published section model now matches the actual public-vs-restricted documentation split.

What changed:
- Replaced the old technical-library Help taxonomy with four audience-aware sections: Public Help, Admin & Operator Guides, Technical Reference, and Security, Deployment & Recovery.
- Reassigned all published Help documents in the docs access policy to those new sections so public visitors only see end-user-safe sectioning while authenticated admins get clearly labeled restricted reference sections.
- Updated the in-app Help sidebar icon mapping to match the new section model.
- Reworked docs/README.md and docs/INDEX.md so their headings and groupings reflect the same taxonomy and no longer imply that repo-only testing, operations, or implementation-plan material is part of public Help.
- Kept structure-reuse guidance, testing docs, operations runbooks, and implementation-plan documents explicitly outside the Help taxonomy for now.

Verification:
- npx eslint frontend/src/pages/HelpPage.tsx
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
