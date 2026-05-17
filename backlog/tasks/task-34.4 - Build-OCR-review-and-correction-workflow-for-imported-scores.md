---
id: TASK-34.4
title: Build OCR review and correction workflow for imported scores
status: To Do
assignee: []
created_date: '2026-05-17 06:12'
updated_date: '2026-05-17 08:00'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add the review experience that lets authorized users inspect OCR-extracted scores and comments, correct mistakes, and explicitly accept the import into the verified scoring workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Authorized users can review extracted values alongside the uploaded source file before acceptance.
- [ ] #2 Users can correct extracted criterion scores, deductions, and comments before committing the import.
- [ ] #3 Only accepted and reviewed OCR imports proceed into the existing scoring and certification flow.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- The review workflow should be entered from the existing contestant-scoped score-file upload surface on scoring pages rather than a separate import-only page.
- UI copy and affordances should stop implying commentary-only attachments once scoresheet import is introduced, and should clearly distinguish ordinary attachments from scoresheet import review.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
UX direction update:
- The scoring review flow should build on the existing score-file upload entry point in the scoring workspace.
- Labels and interaction states must distinguish commentary attachments from scoresheet imports so users understand when an upload will trigger score extraction and review.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
