# Scoring and Certification Workflows

This guide is for judges, delegates, tally staff, auditors, board reviewers,
and anyone who needs the practical step-by-step scoring workflow inside the
application.

Use this guide when you need to know:

- who enters scores
- who certifies them
- what changes when delegated scoring is used
- what the system records for audit and attribution

If you need admin-only setup steps for permissions, grants, or delegated
certification controls, use
[Delegated Scoring Admin and Operator Setup](16-DELEGATED-SCORING-ADMIN-OPERATOR-SETUP.md).

## Choose the Right Path

There are three main judge-stage paths:

1. judge self-entry and self-certification
2. delegated score entry, but the judge still certifies later
3. delegated score entry and delegated certification, only when the tenant has explicitly enabled it

## Path 1: Judge Self-Entry

Use this when the judge can work in the app directly.

### Steps

1. Open scoring.
2. Select the assigned category and contestant.
3. Enter the score and any required commentary.
4. Save the score.
5. Complete the judge certification signature step.

### What gets recorded

- the represented judge is the acting user
- score entry is marked as `SELF`
- no delegation grant is recorded
- judge certification is also recorded as `SELF`

## Path 2: Delegated Score Entry, Judge Certifies Later

Use this when the judge can provide scoring intent, but cannot type or upload in
the app directly.

Examples:

- the judge scores on paper
- the judge is temporarily unable to use the device
- an operator is transcribing scores after the round

Recommended role for that operator:

- `DELEGATE`

### Steps

1. The delegate opens scoring.
2. The delegate chooses the represented judge from the eligible judge list.
3. The delegate enters scores or uploads score files on behalf of that judge.
4. The delegate saves the score data.
5. The represented judge later completes the certification step in the app.

### What gets recorded

- `judgeId` stays tied to the represented judge
- the acting user is recorded separately
- score entry is marked as `DELEGATED`
- the delegation grant used is recorded
- the score is not certified just because it was entered

### Important rule

If delegated certification is not enabled for the tenant, this path still
requires the represented judge to certify later.

## Path 3: Delegated Entry and Delegated Certification

Use this only when the represented judge cannot interact with the app directly
and the tenant has chosen to allow delegated judge certification.

### Required conditions

All of these must be true:

1. the delegate has an active grant covering the represented judge and category
2. the delegate has delegated certification permission
3. the tenant has enabled delegate judge certification
4. the represented judge's score coverage is complete

### Steps

1. The delegate opens scoring and selects the represented judge.
2. The delegate enters or reviews the represented judge's scores.
3. The delegate opens the certification step.
4. The delegate signs on behalf of the represented judge.
5. The system records delegated judge certification for the represented judge.

### What gets recorded

- the represented judge remains the judge of record
- the acting certifier user is recorded separately
- certification mode is recorded as `DELEGATED`
- the delegation grant used is recorded on the certification row

## Tally Master Stage

After all required judge-stage certifications are complete:

1. open the tally certification work
2. verify judge-stage completion
3. certify totals

Delegated judge certification, when enabled, satisfies the represented judge
stage. It does not remove or shorten tally requirements.

## Auditor Stage

After tally certification:

1. open pending auditor certification work
2. review the certified category state
3. complete auditor certification

Delegated judge activity does not replace auditor review.

## Board or Final Approval Stage

After auditor certification:

1. open the final approval or board review step
2. review the final certified category
3. approve or certify the final stage

Delegated judge activity does not replace the final approval stage.

## Audit and Attribution Summary

### Self-entry

- represented judge and acting user are the same
- no grant is involved

### Delegated entry only

- represented judge and acting user are different
- the grant used is recorded
- certification is still separate

### Delegated entry plus delegated certification

- represented judge and acting user are different
- the grant used is recorded on both entry and certification
- downstream tally, auditor, and board stages still happen normally

## When to Ask an Admin or Organizer for Help

Ask for admin help when:

- the represented judge does not appear in the eligible judge list
- delegated entry is needed but your account cannot select a represented judge
- delegated certification is needed but the certification step is blocked
- a grant needs to be revoked or narrowed

For setup and control steps, use
[Delegated Scoring Admin and Operator Setup](16-DELEGATED-SCORING-ADMIN-OPERATOR-SETUP.md).
