# Scope-Aware Permissions v1 / v1.1

## Purpose

This document defines the v1 scope-aware permissions model introduced by `TASK-77`.

The goal of v1 is to keep dynamic action permissions and data visibility boundaries aligned for a limited first wave of tenant-manageable resources without attempting a whole-codebase rewrite in one step.

## Core Model

Each tenant-manageable surface now has two distinct concerns:

- Action permission
  Can the role perform the action at all?
- Resource scope
  Over which records can the role perform the action?

v1 stores scope at `role + resource`.

`TASK-78` extends that model so v1.1 can also store optional overrides at
`role + resource + operation` without breaking the existing resource-level rows.

## Scope Values

v1 supports:

- `ASSIGNMENT`
- `EVENT`
- `TENANT`

`workflow` is intentionally deferred.

## Storage Model

Action permissions remain in `role_permissions`.

Resource scope is stored in `role_permission_scopes` with one row per:

- `tenantId`
- `role`
- `resource`

In v1.1, the same table also supports optional operation-specific rows with:

- `tenantId`
- `role`
- `resource`
- `operation`

Permission audit logs now also support scope changes through:

- `previousScope`
- `newScope`
- `changeType`

v1.1 adds `OPERATION_SCOPE` as an audit change type so operation overrides and
resource-default changes remain distinguishable in the audit trail.

## Authority Rules

### Dynamic Pages

For first-wave dynamic pages, access requires both:

1. membership in the intended base-role family for the page
2. the relevant dynamic `resource:read` permission

This prevents dynamic resource permissions from broadening access to unrelated roles.

### Hard-Protected Pages

Hard-protected pages remain role-gated and are not widened by dynamic CRUD permissions.

## First-Wave Resources

v1 applies the action-permission plus scope model to:

- `deductions`
- `certifications`
- `reports`
- `files`

## Default Scope Rules

Fixed tenant-wide admin-plane roles:

- `SUPER_ADMIN`
- `ADMIN`
- `ORGANIZER`

First-wave default scopes:

- `BOARD`
  - `deductions`: `EVENT`
  - `certifications`: `EVENT`
  - `reports`: `TENANT`
  - `files`: `EVENT`
- `TALLY_MASTER`
  - `deductions`: `ASSIGNMENT`
  - `certifications`: `ASSIGNMENT`
  - `reports`: `TENANT`
- `AUDITOR`
  - `deductions`: `ASSIGNMENT`
  - `certifications`: `ASSIGNMENT`
  - `reports`: `TENANT`
- `JUDGE`
  - `deductions`: `ASSIGNMENT`
  - `certifications`: `ASSIGNMENT`

## Enforcement Pattern

The enforcement pattern for v1 is:

1. middleware enforces action permission such as `deductions:read` or `files:write`
2. a shared scope resolver determines the caller’s effective scope
3. controller queries are filtered to the resolved scope

This keeps the same resource model across:

- nav visibility
- page access
- API authorization
- data results

## First-Wave Notes

### Deductions

`TASK-73` established deductions as the reference implementation. `TASK-77` moves deductions scope resolution onto the shared scope service.

### Certifications

The certifications route family now uses:

- `certifications:read`
- `certifications:write`

and resolves assignment/event/tenant scope through the shared model.

### Reports

Reports are included in the first wave for action-permission alignment, but scope remains effectively `TENANT` in v1.

Reason:

`ReportInstance` does not currently store event/contest/category linkage, so event-scoped or assignment-scoped report history would be misleading.

### Files

The file-management surface now uses dynamic `files` permissions and scope-aware DB-backed listing for authenticated file inventory paths.

## Admin Management Surface

v1 extends the existing Permissions page instead of adding a second admin screen.

The page now manages:

- action permissions
- resource scope defaults for scope-capable resources
- optional operation-level scope overrides for scope-capable resources

Some roles remain fixed in v1 and therefore have non-editable scope rows.

## Resolution Order

v1.1 resolves scope in this order:

1. operation-specific override for `role + resource + operation`
2. resource-level scope row for `role + resource`
3. fixed/default role scope from `defaultPermissionScopes.ts`
4. `TENANT` when the resource is not scope-capable

This keeps older callers safe because resource-level rows still remain authoritative
when no operation override exists.

## Migration Path

The migration from v1 to v1.1 is additive:

1. existing `role + resource` rows remain valid and become the inherited default layer
2. the scope resolver accepts an optional `operation`
3. first-wave controllers can pass the concrete permission operation (`read`, `write`, `create`, `approve`, `reject`) when they want operation-specific scope to apply
4. when no explicit override row exists, the resolver falls back automatically to the resource-level row

Operation override removal is modeled as “inherit resource default” rather than a separate default row.

## Deferred Work

Further expansion beyond v1.1 is still deferred.

Future candidates:

1. wider adoption across more resource families beyond the first wave
2. more explicit operator reporting on inherited vs overridden scope state
3. operation-specific option constraints when a resource should not expose every scope level for every operation
