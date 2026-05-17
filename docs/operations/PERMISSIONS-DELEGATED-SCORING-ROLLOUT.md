# Permissions and Delegated Scoring Rollout

Last Updated: 2026-05-17

## Purpose

This runbook is the deploy and operations contract for the permission-model,
scoped-enforcement, and delegated-scoring work delivered through:

- `TASK-78`
- `TASK-93`
- `TASK-94`

Use this document for production or tenant rollout. It supersedes the older
historical-only audit sections when the goal is to understand the current live
runtime contract.

## Scope

This rollout covers:

- `/permissions` self-governance
- operation-specific scope overrides for scope-capable resources
- aligned CRUD enforcement for the remaining core route families
- delegated score-entry fallback when judges cannot enter directly

It does not include OCR ingestion from `TASK-34`. OCR remains an optional future
input path. Delegated score entry is the supported fallback if OCR is not
available or not reliable enough.

## Final Runtime Contract

### `/permissions`

The permissions-management surface is now hybrid-governed:

- base role boundary:
  - `SUPER_ADMIN`
  - `ADMIN`
  - `ORGANIZER`
- dynamic permission requirement:
  - `permissions:read` for list, scopes, stats, audit logs, and export
  - `permissions:write` for permission updates, scope updates, and cache warm

Important consequence:

- qualifying by role alone is no longer enough
- an admin-plane role without the required `permissions:*` token will be denied
- at least one administrative recovery path must retain `permissions:write`

### Operation-specific scope resolution

For scope-capable resources, effective scope now resolves in this order:

1. `role + resource + operation` override
2. `role + resource` default
3. default role scope from `defaultPermissionScopes.ts`
4. `TENANT` for non-scope-capable resources

Scope-capable resources in the current rollout:

- `deductions`
- `certifications`
- `reports`
- `files`
- `score-governance`
- `score-removal`
- `score-files`

Current caveat:

- `reports` remains tenant-only in practice
- this rollout makes that explicit and enforced
- it does not introduce finer-grained report scopes

### Aligned CRUD authority

The following route families now materially respond to `/permissions` updates:

- `events`
- `contests`
- `categories`
- `users`
- `assignments`
- `results`
- winners publication routes
- previously aligned families from `TASK-93`:
  - `settings`
  - `reports`
  - `files`
  - `tracker`
  - `templates`
  - `deductions`
  - `certifications`

These surfaces remain hybrid, not fully dynamic:

- a fixed workflow role family still defines who may ever access the surface
- dynamic permission rows decide whether the role may perform the action

### Delegated scoring

Delegated score entry is now a first-class fallback model with separate
authority from ordinary `scores:*`.

Resources:

- `delegated-scores:read`
- `delegated-scores:write`
- `score-delegations:read`
- `score-delegations:write`
- `score-delegations:revoke`

Runtime rules:

- ordinary judge self-entry remains governed by `scores:*`
- on-behalf entry requires an active delegation grant
- delegated entry remains attributable to:
  - the represented judge
  - the actual entry actor
  - the delegation grant used
- delegated entry does not certify on the judge's behalf

Attribution fields now present in the schema:

- `Score.enteredByUserId`
- `Score.entryMode`
- `Score.delegationGrantId`
- `ScoreFile.uploadedById`
- `ScoreFile.entryMode`
- `ScoreFile.delegationGrantId`

## Required Database Changes

The following migrations must be present in the target environment:

1. `20260511233000_task77_permission_scopes_v1`
2. `20260516223000_task78_operation_specific_permission_scopes`
3. `20260516235900_task94_delegated_score_entry`

Deploy command:

```bash
npx prisma migrate deploy
```

Verification commands:

```bash
npx prisma migrate status
npx prisma generate
```

Do not treat this rollout as live until the schema is updated. The delegated
scoring and operation-specific scope paths rely on additive columns and tables
introduced by these migrations.

## Configuration and Seed Expectations

### Environment variables

No new environment variables are required by this rollout.

### Tenant permission-row initialization

Runtime permission evaluation merges static defaults with tenant overrides, so
new resources can take effect even before explicit rows exist.

However, existing tenants still need concrete `role_permission` and
`role_permission_scope` rows if admins are expected to manage the new resources
through `/permissions`.

Important nuance:

- `GET /api/permissions` only bootstraps defaults when the tenant has no
  permission rows at all
- `GET /api/permissions/stats` and `GET /api/permissions/scopes` always invoke
  tenant initialization for the current tenant context

Recommended tenant bootstrap step after deploy:

1. sign in as `SUPER_ADMIN` or `ADMIN`
2. open `/permissions`
3. load the scopes or stats views for each tenant that should manage these
   resources

This ensures:

- newly added resources are materialized in the tenant matrix
- default scope rows are created where applicable

### Cache behavior

Permission reads are cached per tenant and role.

Recommended post-bootstrap step:

```text
POST /api/permissions/cache/warm
```

Notes:

- only `SUPER_ADMIN` and `ADMIN` can warm cache
- cache warm does not seed missing rows by itself
- seed/bootstrap first, then warm cache

## Release Order

Use this order in each target environment.

1. Confirm the release artifact contains backend, frontend, and Prisma changes
   from `TASK-78`, `TASK-93`, and `TASK-94`.
2. Back up the target database according to the standard production process.
3. Apply Prisma migrations with `npx prisma migrate deploy`.
4. Generate the Prisma client if your release process does not already do so.
5. Deploy or restart the backend application.
6. Deploy the frontend bundle built from the same release.
7. For each tenant, bootstrap permissions rows by visiting `/permissions/scopes`
   or `/permissions/stats` as an authorized admin.
8. Warm the permission cache for each tenant.
9. Review and adjust role permissions for the newly introduced resources before
   announcing the workflow as available.
10. Run the UAT matrix in this document before broad tenant enablement.

Avoid splitting backend and frontend rollout across separate releases. The new
pages and affordances assume the backend permission contract is already present.

## Deployment Checklist

### Predeploy

- Confirm all three required migrations are present in the release.
- Confirm the target environment backup is current.
- Confirm the release includes backend route, frontend page-policy, and
  delegated-scoring changes together.
- Confirm at least one `SUPER_ADMIN` or `ADMIN` account will retain
  `permissions:write` during rollout.

### Deploy

- Run `npx prisma migrate deploy`.
- Restart or activate the backend release.
- Deploy the matching frontend build.
- Verify application startup is healthy.

### Postdeploy bootstrap

- Initialize tenant permission rows through `/permissions/stats` or
  `/permissions/scopes`.
- Warm cache through `/permissions/cache/warm`.
- Confirm the new resources are visible in `/permissions`:
  - `score-governance`
  - `score-removal`
  - `score-files`
  - `delegated-scores`
  - `score-delegations`
  - `permissions`

### Postdeploy admin review

- Review `permissions:read` and `permissions:write` assignments for
  `ADMIN` and `ORGANIZER`.
- Review delegated-scoring grants and management permissions:
  - who may create or revoke grants
  - who may enter delegated scores
- Review scope defaults and operation overrides for scope-capable resources.

## Admin and Operator Guide

### 1. Enable the fallback model

Minimum permissions by responsibility:

- permission administrators:
  - `permissions:read`
  - `permissions:write`
- delegation managers:
  - `score-delegations:read`
  - `score-delegations:write`
  - `score-delegations:revoke`
- delegates who may enter on behalf of judges:
  - `delegated-scores:read`
  - `delegated-scores:write`

Default expectation:

- broad delegated-entry capability should remain limited to
  `SUPER_ADMIN` and `ADMIN` until a tenant explicitly chooses otherwise

### 2. Create a delegation grant

The grant-management workflow is surfaced through the score-governance tooling
and the `/api/score-delegations` API.

Supported coverage:

- one judge
- selected judges
- all judges in scope

Supported scopes:

- category
- contest
- event
- tenant

Required grant inputs:

- delegate user
- scope level and scope target
- coverage mode
- represented judge list when using `SELECTED_JUDGES`
- start time
- expiry time when appropriate
- reason

Operational guidance:

- use the narrowest scope that solves the incident
- prefer explicit expiry for temporary outages
- record a reason tied to the operational issue or scoring contingency

### 3. Delegate score entry

When a delegate has an active grant:

1. open the scoring workflow
2. choose the represented judge from the eligible judge list
3. enter scores or upload score files on behalf of that judge
4. save the staged score data

Important behavior:

- the system records the represented judge and actual actor separately
- delegated uploads and score saves remain attributable
- the represented judge remains the judge of record

### 4. Certification handling

Delegated entry is not certification.

Operators must treat the flow as:

1. fallback entry or upload
2. judge review when feasible
3. certification through the normal certification workflow

Do not use delegated entry as a substitute for judge intent unless a future,
separately approved policy explicitly changes that rule.

### 5. Revoke or expire a grant

Use revocation when:

- the outage has ended
- the delegate no longer needs on-behalf authority
- the grant was created too broadly
- the represented judge set has changed

Current management path:

- `POST /api/score-delegations/:id/revoke`

Recommended operating practice:

- revoke immediately once the contingency has ended
- prefer short-lived grants over indefinite grants

### 6. Audit and review

Use these sources during review:

- active and historical grant lists from `/api/score-delegations`
- activity logs for grant creation and revocation
- score and score-file attribution fields showing actor, mode, and grant linkage
- normal score and certification workflows for downstream verification

## Post-Deploy Validation and UAT

Run these checks in a UAT or staging environment first, then repeat the
critical path in production after deployment.

### Permissions administration

- confirm `ADMIN` with `permissions:read` can access `/permissions`
- confirm `ORGANIZER` without `permissions:read` is denied
- confirm only `ADMIN` or `SUPER_ADMIN` can warm cache
- confirm new resources appear in the matrix after bootstrap

### Scope-aware resources

- confirm `files` scope affects inventory and file-management analytics
- confirm `deductions` scope affects visible deductions data
- confirm `certifications` scope affects visible certification data
- confirm `reports` remains tenant-scoped and does not imply finer scope

### Core CRUD alignment

- toggle `events:*` and verify direct event API access changes
- toggle `users:*` and verify direct user-management API access changes
- toggle `assignments:*` and verify direct assignments API access changes
- toggle `results:*` and verify winners publication access changes

### Delegated scoring

- create a one-judge delegation grant and verify only that judge is eligible
- create a selected-judges grant and verify only the chosen judges are eligible
- create an all-judges-in-scope grant and verify broad eligibility in the
  chosen scope only
- verify delegated score entry writes actor attribution correctly
- verify delegated score-file upload writes actor attribution correctly
- verify grant revocation removes further delegated access
- verify delegated entry does not mark scores certified by itself

### Containment checks

- verify permissions can be restored from `/permissions` without redeploy
- verify grants can be revoked without redeploy
- verify cache warm refreshes the changed permission state promptly

## Rollback and Containment

Prefer containment over schema rollback.

### First response for authorization mistakes

- restore the affected permission rows in `/permissions`
- revoke over-broad delegation grants
- warm cache after correction

### If the release must be contained quickly

- disable delegated-scoring permissions for affected roles
- keep grant-management limited to `SUPER_ADMIN` and `ADMIN`
- if needed, remove `permissions:write` from non-recovery roles until review is
  complete

### Application rollback

If the deployed application behavior is materially wrong:

- roll back the application release using the standard release activation
  procedure
- do not immediately attempt destructive database rollback

The relevant schema changes are additive. The safer incident response is usually:

1. contain via permissions
2. roll back application code if necessary
3. investigate before any database reversion decision

## Remaining Blockers and Follow-Up

Release blockers before production go-live:

- the three required migrations must be applied
- tenant permission rows and scope rows must be bootstrapped where admin editing
  is expected
- postdeploy UAT must pass for permissions, scopes, and delegated scoring

Current repo status after `TASK-94`:

- no additional feature-code blocker is known inside the shipped permission and
  delegated-scoring implementation

Non-blocking follow-up worth scheduling:

- normalize stale integration helpers so they always match the current Prisma
  schema without ad hoc fixes in new tests
- continue `TASK-34` OCR work as an optional future input path, not as a
  prerequisite for delegated scoring
