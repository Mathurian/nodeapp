# Delegated Scoring Admin and Operator Setup

This guide is for organizers, administrators, and operators who manage
permissions, grants, and fallback scoring policy.

If you are a judge, delegate, tally master, auditor, or board reviewer looking
for the execution workflow, use
[Scoring and Certification Workflows](15-SCORING-CERTIFICATION-WORKFLOWS.md).

## What This Guide Covers

- when to use delegated scoring
- when to use the dedicated `DELEGATE` role instead of overloading `BOARD`
- which permissions must be assigned
- how to create and revoke grants
- when to enable delegated certification
- what gets recorded for audit and chain of custody

## Recommended Fallback Role

Use the dedicated `DELEGATE` role for fallback score-entry operators.

Do not assign `BOARD` just to satisfy scoring access unless you are dealing with
an older tenant state that has not yet adopted the dedicated delegate role.

## 1. Decide Which Operational Mode You Need

Use normal scoring when judges can work in the app directly.

Use delegated score entry when:

- judges are scoring on paper
- judges can provide scoring intent but not app interaction
- operators must transcribe or upload score material later

Enable delegated certification only when:

- the represented judge cannot complete certification in the app
- the tenant intentionally wants a delegate to sign on the judge's behalf
- the operational risk and audit implications are understood

## 2. Confirm the Required Permissions

Minimum permissions by function:

### Permission administrators

- `permissions:read`
- `permissions:write`

### Delegation managers

- `score-delegations:read`
- `score-delegations:write`
- `score-delegations:revoke`

### Delegates who may enter scores on behalf of judges

- `delegated-scores:read`
- `delegated-scores:write`

### Delegates who may certify on behalf of judges

- `delegated-scores:certify`

### Judges certifying themselves

- `scores:certify`

## 3. Choose Whether to Enable Delegated Certification

The scoring governance safeguards include:

- `Allow delegate judge certification`

### If this stays disabled

- delegates can still enter or upload on behalf of judges
- represented judges still need to certify later
- this is the safer default for paper-form transcription workflows

### If this is enabled

- delegates with the right grant and permission can certify on behalf of represented judges
- the acting user and grant are recorded on the certification row
- downstream tally, auditor, and board requirements do not change

## 4. Create the Delegation Grant

Supported grant coverage:

- one judge
- selected judges
- all judges in scope

Supported scopes:

- category
- contest
- event
- tenant

### Recommended steps

1. Choose the narrowest scope that solves the incident.
2. Prefer `SELECTED_JUDGES` when only a few judges are affected.
3. Use explicit expiry whenever the outage is temporary.
4. Record the operational reason for the grant.
5. Review whether the delegate should have entry only or entry plus certification.

## 5. Communicate the Expected Branch

Before the round starts, confirm which branch the team is using:

### Branch A: Self-entry

- judge enters and certifies directly

### Branch B: Delegated entry only

- delegate enters
- represented judge certifies later

### Branch C: Delegated entry plus delegated certification

- delegate enters
- delegate certifies on behalf of the represented judge
- only valid when the safeguard is enabled

This prevents the scoring team from assuming certification rights that do not
exist.

## 6. Understand the Audit Trail

### Delegated score entry records

For delegated score rows, the system records:

- the represented `judgeId`
- the actual entry actor
- `entryMode = DELEGATED`
- the delegation grant used

### Delegated score-file upload records

For delegated score files, the system records:

- the represented `judgeId`
- the uploading user
- `entryMode = DELEGATED`
- the delegation grant used

### Delegated judge certification records

When delegated certification is enabled and used, the system records:

- the represented `judgeId`
- the acting certifier user
- `certificationMode = DELEGATED`
- the delegation grant used

## 7. Revoke or Expire the Grant

Revoke the grant when:

- the judge can resume direct interaction
- the incident has ended
- the grant was broader than necessary
- the delegate no longer needs access

Recommended practice:

1. revoke immediately after the contingency ends
2. avoid indefinite grants
3. verify that no additional judges remain unintentionally covered

## 8. Recovery and Exception Handling

The older administrative recovery path still exists for exceptional support.

Use it carefully:

- it is not the normal grant-based workflow
- it should not replace delegated scoring policy for planned operations
- it should be treated as an exception, not as the default way to certify on behalf of judges

## 9. Cross-Check Before Live Use

Before a live round:

1. confirm the delegate can see the represented judge
2. confirm the represented judge set is no broader than intended
3. confirm whether delegated certification is disabled or enabled
4. confirm the expected post-judge path for tally and auditor
5. confirm who will revoke the grant afterward

## Related Guides

- user and role workflow guide:
  [Scoring and Certification Workflows](15-SCORING-CERTIFICATION-WORKFLOWS.md)
- rollout contract:
  use the repository operations runbook `docs/operations/PERMISSIONS-DELEGATED-SCORING-ROLLOUT.md`
