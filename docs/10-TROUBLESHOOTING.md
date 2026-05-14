# Troubleshooting

Use this guide for common end-user and operator issues before escalating to support. This article intentionally focuses on app usage, access, and browser behavior rather than infrastructure or server administration.

## Start With These Checks

Before you report a problem:

1. Confirm you are in the correct tenant.
2. Refresh the page once.
3. Sign out and back in if your session looks stale.
4. Check whether the feature depends on role, certification, or published results.
5. Try the same action in another supported browser if the page looks broken.

## I Cannot Sign In

Check the basics first:

- confirm your email and password
- confirm you are using the correct tenant login page
- complete MFA if your organization requires it
- if you belong to multiple tenants, make sure you selected the correct one

If you still cannot sign in:

- use the password reset flow if your tenant supports it
- contact your organizer or administrator if you think your account is inactive or assigned to the wrong tenant

## I Signed In but the Page or Action I Need Is Missing

This is often expected behavior rather than a bug.

Possible reasons:

- your role does not include that area
- the workflow has not reached the stage where that action becomes available
- your organization has not published that information yet
- you are in the wrong tenant or event

Examples:

- contestants may not see results until they are published
- judges may see score entry but not admin configuration
- board, auditor, tally, and emcee workflows are narrower than administrator views

If you believe access is wrong, capture the exact page and missing action before contacting support.

## Results Are Not Visible

Results visibility can be limited on purpose.

Check whether:

- winners or overall results have actually been published
- the event has release restrictions or overrides
- certification is still in progress
- your role is allowed to see that result type

If another user can see the results and you cannot, include both roles when reporting the issue.

## Scores or Commentary Are Not Appearing

Try these checks:

- confirm you are looking at the correct event, contest, category, and contestant
- confirm the scores were submitted or synced, not just left as local draft work
- refresh after reconnecting if you were recently offline
- if certification is still pending, remember that saved scores and certified scores are different states

If you recently worked offline, wait for sync to finish before assuming the data is lost.

## The Page Looks Broken or Will Not Load

Try the standard browser steps:

1. Refresh the page.
2. Close and reopen the browser tab.
3. Clear cached site data if the page looks stuck on an older version.
4. Try another supported browser.
5. Disable aggressive content blockers for the tenant site if they interfere with login or popups.

If you use the installed mobile app experience, fully close and reopen it before escalating.

## Printing or Export Is Not Working

Check whether:

- popups are blocked
- your browser download settings are blocking the file
- you can export to PDF even if a printer is unavailable
- the action is available for your role

If the action does nothing, note the exact page and button name when reporting it.

## Realtime or Connectivity Warnings

Brief connection warnings can happen when:

- your network drops or changes
- the app is recovering after sleep
- you went offline intentionally

If the warning clears on its own and your data appears after refresh or sync, that usually does not indicate a permanent problem.

## When to Escalate

Contact your organizer, administrator, or support contact when:

- you cannot sign in after confirming the correct tenant and credentials
- your role appears wrong
- a workflow step remains blocked after refresh and reconnect
- published results are missing for the users who should see them
- a page repeatedly fails in more than one browser

Include:

- the tenant name or slug
- your role
- the page you were on
- the exact button or action you used
- the approximate time of the issue
- screenshots if possible

## Need Technical or Server-Side Troubleshooting?

This guide is intentionally not the place for deployment, database, JWT, Prisma, or infrastructure debugging.

Use the repo-only technical references from [INDEX.md](INDEX.md) if you are part of the internal engineering or operator team.
