# Scoring and Certification Workflow Guide

Last Updated: 2026-05-17

## Purpose

This guide explains the live scoring, delegated scoring, delegated
certification, and downstream certification workflows after `TASK-94.7`.

Use this document when you need the full operational model across all impacted
roles:

- judges
- delegates entering on behalf of judges
- organizers and admins configuring permissions and grants
- tally masters
- auditors
- board or final approvers

This guide complements the rollout runbook in
[PERMISSIONS-DELEGATED-SCORING-ROLLOUT.md](./PERMISSIONS-DELEGATED-SCORING-ROLLOUT.md).

## Workflow Branches

There are now three distinct judge-stage input paths:

1. judge self-entry and self-certification
2. delegated entry without delegated certification
3. delegated entry with delegated certification enabled

The branch matters because the system records and required permissions differ.

## Admin and Organizer Setup

### 1. Confirm the tenant is ready

Before using any delegated scoring fallback:

1. Confirm the required migrations are deployed.
2. Confirm the tenant permission rows have been initialized.
3. Confirm at least one recovery admin still has `permissions:write`.
4. Confirm the scoring team knows whether delegate certification is enabled or disabled.

### 2. Assign the right permissions

Minimum authority by responsibility:

- permission administrators:
  - `permissions:read`
  - `permissions:write`
- delegation managers:
  - `score-delegations:read`
  - `score-delegations:write`
  - `score-delegations:revoke`
- delegates who may enter scores on behalf of judges:
  - `delegated-scores:read`
  - `delegated-scores:write`
- delegates who may certify on behalf of judges:
  - `delegated-scores:certify`

Normal judge self-certification still depends on `scores:certify`.

### 3. Decide whether delegated certification is allowed

The tenant safeguard is controlled in score governance settings:

- `Allow delegate judge certification`

If this stays off:

- delegates may still enter scores on behalf of judges
- represented judges must still certify later
- the admin recovery path remains available for exceptional recovery

If this is turned on:

- an authorized delegate may certify on behalf of a represented judge
- the delegate still needs a covering active grant
- the delegate still needs `delegated-scores:certify`

### 4. Create the delegation grant

Delegation grants may cover:

- one judge
- selected judges
- all judges in scope

Supported scopes:

- category
- contest
- event
- tenant

Recommended practice:

1. use the narrowest scope that solves the incident
2. prefer explicit expiry for temporary outages
3. capture a reason tied to the operational problem
4. revoke the grant as soon as the contingency ends

## Judge Self-Entry Workflow

Use this path when the judge can work in the application normally.

### Step by step

1. The judge opens scoring.
2. The judge selects the assigned category and contestant.
3. The judge enters scores and commentary directly.
4. The judge saves the scores.
5. The judge signs or certifies the scores in the normal certification step.
6. After all required judge-stage certifications are complete, tally master certification can proceed.

### What the system records

For normal self-entry:

- `Score.judgeId` = the judge entering the score
- `Score.enteredByUserId` = the same acting user
- `Score.entryMode` = `SELF`
- `Score.delegationGrantId` = `null`

For normal self-certification:

- `judge_certifications.judgeId` = the represented judge
- `judge_certifications.certifiedByUserId` = the same acting user
- `judge_certifications.certificationMode` = `SELF`
- `judge_certifications.delegationGrantId` = `null`

## Delegated Entry Without Delegated Certification

Use this path when a judge can score on paper or otherwise provide intent, but
someone else must enter the data.

### Step by step

1. An admin or organizer confirms the delegate has:
   - `delegated-scores:read`
   - `delegated-scores:write`
   - an active grant covering the represented judge and category
2. The delegate opens scoring.
3. The delegate chooses the represented judge from the eligible judge list.
4. The delegate enters scores or uploads score files on behalf of that judge.
5. The delegate saves the score data.
6. The represented judge later reviews and certifies in the application when feasible.
7. After judge certification is complete, tally master certification proceeds as normal.

### What the system records

For delegated entry:

- `Score.judgeId` = the represented judge
- `Score.enteredByUserId` = the actual delegate user
- `Score.entryMode` = `DELEGATED`
- `Score.delegationGrantId` = the grant used

For delegated score-file upload:

- `ScoreFile.judgeId` = the represented judge
- `ScoreFile.uploadedById` = the actual delegate user
- `ScoreFile.entryMode` = `DELEGATED`
- `ScoreFile.delegationGrantId` = the grant used

### Certification rule

In this branch, score entry does not certify on the judge's behalf.

The represented judge must still complete the judge-stage certification step
unless an admin uses the explicit recovery path or the tenant has enabled
delegated certification.

## Delegated Entry With Delegated Certification Enabled

Use this path when the represented judge cannot interact with the application
directly and the tenant has explicitly enabled delegate certification.

### Required conditions

All of these must be true:

1. the tenant setting `Allow delegate judge certification` is enabled
2. the acting user has `delegated-scores:certify`
3. an active delegation grant covers the represented judge and category
4. the represented judge has complete score coverage for the category or
   contestant being certified

### Step by step

1. An admin or organizer enables the delegate-certification safeguard only if the tenant intends to allow on-behalf judge sign-off.
2. The delegate opens scoring and selects the represented judge.
3. The delegate enters or confirms the scores on behalf of that judge.
4. The delegate opens the certification step for the category or contestant.
5. The delegate signs on behalf of the represented judge.
6. The system records judge-stage certification for the represented judge with delegated attribution.
7. Once all required judges are complete, tally master certification proceeds normally.

### What the system records

For delegated certification:

- `judge_certifications.judgeId` = the represented judge
- `judge_certifications.certifiedByUserId` = the actual delegate user
- `judge_certifications.certificationMode` = `DELEGATED`
- `judge_certifications.delegationGrantId` = the grant used

Important consequence:

- the represented judge remains the judge of record for the category
- the delegate becomes the certifying actor of record
- the grant used is preserved for audit

## Tally Master Workflow

Use this path after judge-stage certification is complete.

### Step by step

1. The tally master opens the pending certification work.
2. The tally master verifies the category is judge-certified.
3. The tally master signs the totals certification step.
4. The system records the tally certification.
5. The category becomes eligible for auditor certification.

### What the system records

- tally-stage certification remains separate from judge-stage certification
- delegated judge certification, when enabled, satisfies the represented
  judge-stage requirement but does not change tally requirements

## Auditor Workflow

Use this path after tally master certification is complete.

### Step by step

1. The auditor opens categories pending final audit.
2. The auditor verifies that judge and tally stages are complete.
3. The auditor signs the auditor certification step.
4. The system records the auditor certification.
5. The category becomes eligible for board or final approval where applicable.

### What the system records

- auditor-stage certification remains a separate certification record
- delegated judge certification does not bypass or replace auditor review

## Board or Final Approval Workflow

Use this path only after auditor certification is complete.

### Step by step

1. The board or final approver reviews the final certified category state.
2. The approver signs or approves the final stage.
3. The system marks the category as finally approved or certified according to the workflow.

### What the system records

- board approval remains the final stage of the category workflow
- earlier delegated judge activity remains visible in audit and certification attribution, but does not replace the board action

## Revocation and Recovery

### Grant revocation

Use revocation when:

- the judge can resume direct scoring
- the incident has ended
- the grant is broader than necessary
- the delegate no longer needs access

Effect:

- new delegated access stops
- previously recorded delegated score and certification attribution remains in place for audit

### Administrative recovery

The legacy admin recovery path still exists for exceptional operations support.

Use it sparingly:

- it is not the normal scoring path
- it should not replace the grant-based delegated workflow for recurring operations

## Chain of Custody Summary

### Self-entry and self-certification

- represented judge and acting user are the same
- no delegation grant is involved

### Delegated entry without delegated certification

- represented judge and acting user are different
- the grant is recorded on delegated score activity
- certification remains separate and later

### Delegated entry with delegated certification

- represented judge and acting user are different
- the grant is recorded on both entry and judge certification
- downstream tally, auditor, and board stages remain unchanged

## Related Guides

- rollout contract:
  [Permissions and Delegated Scoring Rollout](./PERMISSIONS-DELEGATED-SCORING-ROLLOUT.md)
- permissions authority model:
  [Dynamic CRUD Permissions Audit](./DYNAMIC-CRUD-PERMISSIONS-AUDIT.md)
