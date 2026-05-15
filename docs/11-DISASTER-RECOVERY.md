# Disaster Recovery Guide

## Overview

The Event Manager disaster recovery surface is an authenticated admin tool for configuring backup targets, scheduling recurring backups, running manual backup and DR test actions, and reviewing DR metrics.

This guide reflects the current shipped DR model:
- access is limited to `ADMIN` and `SUPER_ADMIN`
- DR configuration is managed through the authenticated Disaster Recovery page and `/api/dr/*` endpoints
- backup schedules, backup targets, DR tests, and metrics are first-class concepts
- restoration remains an operator-run procedure rather than a one-click in-app restore workflow

## What The Product Supports Today

### Access Model

- DR routes require authentication.
- DR management is restricted to `ADMIN` and `SUPER_ADMIN`.
- The primary UI surface is the authenticated `/dr` page.

### Core DR Capabilities

- Configure tenant DR settings such as RTO/RPO targets and retention guidance
- Create and manage backup targets
- Create and manage backup schedules
- Verify backup target connectivity
- Execute manual backup runs
- Execute DR tests
- Review metrics, dashboard summaries, and RTO/RPO status

### Current API Surface

The current DR API surface is:

```text
GET    /api/dr/config
POST   /api/dr/config
PUT    /api/dr/config/:id

GET    /api/dr/schedules
POST   /api/dr/schedules
PUT    /api/dr/schedules/:id
DELETE /api/dr/schedules/:id

GET    /api/dr/targets
POST   /api/dr/targets
PUT    /api/dr/targets/:id
DELETE /api/dr/targets/:id
POST   /api/dr/targets/:id/verify

POST   /api/dr/backup/execute
POST   /api/dr/test/execute

GET    /api/dr/metrics
GET    /api/dr/dashboard
GET    /api/dr/rto-rpo
```

If you are documenting or testing DR behavior, use these routes as the current source of truth rather than older examples such as `POST /api/dr/test`.

## DR Workflow

### 1. Configure DR Settings

Start by creating or updating the DR configuration. The exact stored fields may evolve, but the current UI and API are centered on:

- `rto`
- `rpo`
- backup retention expectations
- test cadence expectations
- notification recipients or related operator metadata

Use DR configuration to define operational targets and expectations, not to imply full automatic failover orchestration.

### 2. Create Backup Targets

Backup targets represent where backup artifacts are written. The product supports target management through:

- `GET /api/dr/targets`
- `POST /api/dr/targets`
- `PUT /api/dr/targets/:id`
- `DELETE /api/dr/targets/:id`
- `POST /api/dr/targets/:id/verify`

Practical guidance:
- create the target
- verify connectivity before assigning it to schedules
- treat target-specific credentials and storage settings as environment-sensitive operator data

Do not rely on older documentation examples as an exhaustive list of supported providers or required fields unless you have revalidated the current controller and service implementation.

### 3. Create Backup Schedules

Schedules are the main “DR plan” concept exposed in the current UI. They define when backups run and which targets they use.

Current schedule management routes:

- `GET /api/dr/schedules`
- `POST /api/dr/schedules`
- `PUT /api/dr/schedules/:id`
- `DELETE /api/dr/schedules/:id`

Recommended operator pattern:
- maintain at least one routine backup schedule
- keep names explicit enough for operators to recognize purpose and cadence
- verify schedule intent against your RPO target

### 4. Run Manual Backup Actions

Use the manual backup execution endpoint when you need an on-demand run:

```http
POST /api/dr/backup/execute
```

This is the current manual execution route. Older examples such as `POST /api/dr/schedules/{id}/execute` are stale.

### 5. Run DR Tests

The current DR test execution route is:

```http
POST /api/dr/test/execute
```

Use it to validate recovery readiness and to keep DR exercises current. The product also exposes supporting metrics so operators can review recent DR activity after running a test.

### 6. Review Metrics And Compliance Signals

Use the following endpoints to review DR health and compliance-oriented status:

```http
GET /api/dr/metrics
GET /api/dr/dashboard
GET /api/dr/rto-rpo
```

These surfaces are better thought of as operator monitoring and reporting tools than as a full disaster orchestration console.

## Recommended Operator Process

1. Set DR targets and retention expectations.
2. Create and verify backup targets.
3. Create recurring schedules aligned to your recovery objectives.
4. Review dashboard and metrics regularly.
5. Run DR tests on a defined cadence and after major operational changes.
6. Keep a separate restoration runbook for the actual recovery procedure.

## Restoration Boundary

The application exposes backup, test, and metrics management, but restoration is still an operator-led process. That means:

- application recovery steps should be maintained in operational runbooks
- database restore actions should be tested outside production first
- recovery validation should include both data integrity and application startup checks

Do not treat the in-app DR page as a complete restoration wizard.

## Best Practices

### Keep The Model Simple

- Use clear names for targets and schedules.
- Separate routine backup activity from DR test activity in operator notes.

### Verify Before You Trust

- Verify targets before attaching them to schedules.
- Review recent metrics after any manual execution or test run.

### Test On Purpose

- Run DR tests on a real cadence.
- Re-test after infrastructure or storage changes.

### Maintain External Recovery Steps

- Keep database and filesystem restoration steps in an operator runbook.
- Record who is responsible for recovery execution and validation.

## Troubleshooting

### Target Verification Fails

Check:
- target credentials or connection details
- environment or network reachability
- storage permissions

### Backups Do Not Run As Expected

Check:
- whether the schedule exists and is active
- whether assigned targets are still valid
- DR metrics and recent execution history

### DR Test Results Look Incomplete

Check:
- that the correct test route was used: `POST /api/dr/test/execute`
- that operators reviewed metrics and dashboard data after the run
- that any external recovery steps referenced by the exercise are still current

## Related Documentation

- [13-ADMIN-GUIDE.md](./13-ADMIN-GUIDE.md)
- [08-DEPLOYMENT.md](./08-DEPLOYMENT.md)
- operational recovery runbooks maintained outside public Help
