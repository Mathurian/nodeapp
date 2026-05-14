---
id: TASK-46.12
title: >-
  Reclassify published Help taxonomy and sectioning for public vs restricted
  documentation
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-14 04:55'
updated_date: '2026-05-14 17:44'
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
- [ ] #1 Inventory the current published Help taxonomy in docs access policy and repo-facing index surfaces, including mismatches between section labels, audience expectations, and actual document content.
- [ ] #2 Identify and document places where technical/admin/developer material is still presented as public getting-started or broad user-facing Help content.
- [ ] #3 Update the Help taxonomy and related index/landing copy so public Help sectioning clearly reflects end-user/operator guidance while restricted documentation is labeled and grouped appropriately for authenticated admin audiences.
- [ ] #4 Verify the resulting taxonomy and descriptions are consistent across the published docs policy, repo-facing index pages, and in-app Help navigation.
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
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
