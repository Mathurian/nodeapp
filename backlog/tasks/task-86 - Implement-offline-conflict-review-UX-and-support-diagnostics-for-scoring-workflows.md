---
id: TASK-86
title: >-
  Implement offline conflict review UX and support diagnostics for scoring
  workflows
status: To Do
assignee: []
created_date: '2026-05-12 16:43'
updated_date: '2026-05-13 22:05'
labels: []
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build on the shipped offline scoring foundations by focusing TASK-86 on the conflict capabilities that are still missing: user-facing review and supported resolution paths for queued scoring/commentary work that cannot be auto-replayed safely, plus clearer support diagnostics around those conflicts. Existing outbox conflict states, replay classification, and telemetry plumbing already exist; this task should harden the human workflow around unresolved conflicts rather than re-implement base queue telemetry from scratch.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Unresolved queued scoring/commentary conflicts surface in an explicit review state with human-readable item identity and do not silently overwrite or disappear.
- [ ] #2 Judges or support users can inspect the local queued change context and the relevant current server state well enough to choose a supported resolution path.
- [ ] #3 Supported resolution actions exist for conflicted scoring/commentary work, at minimum covering discard and replay/reapply paths, with safe handling of already auto-reconciled cases.
- [ ] #4 Operational diagnostics and telemetry continue to expose queued volume, replay outcomes, terminal failures, and conflict counts without leaking sensitive payload data, with any missing visibility gaps closed.
- [ ] #5 Focused verification covers conflict creation, review presentation, discard/reapply behavior, and observability surfaces for scoring/commentary workflows.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
