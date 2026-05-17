---
id: TASK-94.8
title: >-
  Document step-by-step scoring and certification workflows for all impacted
  user types
status: Done
assignee:
  - '@codex'
created_date: '2026-05-17 04:27'
updated_date: '2026-05-17 05:44'
labels: []
dependencies: []
parent_task_id: TASK-94
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Produce practical walkthrough documentation for the final scoring, delegated scoring, delegated certification, and downstream certification flows so each impacted user type understands what they do, when they do it, and what the system records. This should cover normal app scoring, paper-form fallback, delegated entry, delegated certification when enabled, and the admin/operator setup and audit steps needed to support those workflows.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Documentation includes step-by-step walkthroughs for the impacted user types, at minimum: judges, delegates, organizers or admins managing permissions and grants, tally masters, auditors, and board or final approvers where relevant.
- [x] #2 The walkthrough explains the branching behavior between normal judge self-entry, delegated entry without delegate certification, and delegated entry with delegate certification enabled.
- [x] #3 The walkthrough explicitly states what gets recorded for attribution, certification, revocation, and audit in each path so operators understand the chain of custody.
- [x] #4 The walkthrough is aligned with the live permission model, delegated scoring controls, and rollout documentation rather than describing superseded behavior.
- [x] #5 The walkthrough is linked or surfaced in the in-app Help experience where that is operationally appropriate, without exposing admin-only setup guidance as if it were judge-facing workflow help.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create a dedicated step-by-step workflow guide under docs/operations for scoring and certification, instead of burying role walkthroughs inside the rollout runbook.
2. Document the admin and organizer setup path first: permission prerequisites, delegation grants, the delegate-certification safeguard, and the operational decision points between self-entry, delegated entry, and delegated certification.
3. Document the execution paths by impacted user type: judge self-entry, delegate paper-form entry without delegate certification, delegate on-behalf certification when enabled, tally master totals certification, auditor final certification, and board or final approval where relevant.
4. For each path, explicitly state what the system records for attribution, represented judge, acting user, delegation grant usage, certification state, and revocation or recovery behavior so the chain of custody is clear.
5. Surface the new workflow documentation in the in-app Help experience where it is logically appropriate, using links or sections that distinguish general workflow guidance from admin-only setup and control steps.
6. Cross-link the new guide from the existing rollout and operations docs, then do a consistency pass against the live permission model, delegated-scoring contract, and Help-page presentation before closing the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added a canonical operations workflow guide for scoring, delegated scoring, delegated certification, and downstream certification stages at \`docs/operations/SCORING-CERTIFICATION-WORKFLOW-GUIDE.md\`.
- Added two Help-visible published docs: a public workflow guide for judges, delegates, tally, auditor, and board paths, plus a separate admin/operator setup guide for permissions, grants, and delegate-certification controls.
- Updated docs publication policy so the new guides appear in the correct Help sections, with the admin setup guide restricted to \`ORGANIZER\`, \`ADMIN\`, and \`SUPER_ADMIN\`.
- Cross-linked the new guides from Getting Started and the delegated-scoring rollout runbook so users and operators can find the right workflow entry point.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added step-by-step scoring and certification documentation for all impacted roles, with Help-page visibility scoped appropriately.

Changes:
- Added canonical operations guide \`docs/operations/SCORING-CERTIFICATION-WORKFLOW-GUIDE.md\` covering judge self-entry, delegated entry without delegate certification, delegated entry with delegated certification enabled, tally, auditor, board, revocation, recovery, and chain-of-custody behavior.
- Added Help-published user workflow doc \`docs/15-SCORING-CERTIFICATION-WORKFLOWS.md\` for judges, delegates, tally staff, auditors, and board reviewers.
- Added Help-published admin setup doc \`docs/16-DELEGATED-SCORING-ADMIN-OPERATOR-SETUP.md\` for organizers and admins managing permissions, grants, and delegate-certification controls.
- Updated \`src/config/docsAccessPolicy.ts\` so the new guides surface in the correct Help sections and the admin/operator guide is role-restricted.
- Added cross-links from \`docs/02-GETTING-STARTED.md\` and \`docs/operations/PERMISSIONS-DELEGATED-SCORING-ROLLOUT.md\` to the new workflow docs.

Verification:
- \`npm run build\`
- \`cd frontend && npm run build\`

Notes:
- The Help-visible workflow guide intentionally excludes admin-only permission and setup steps; those are surfaced separately in the admin/operator Help doc.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
