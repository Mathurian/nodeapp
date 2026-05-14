---
id: TASK-46.12
title: >-
  Reclassify published Help taxonomy and sectioning for public vs restricted
  documentation
status: To Do
assignee: []
created_date: '2026-05-14 04:55'
updated_date: '2026-05-14 14:09'
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
