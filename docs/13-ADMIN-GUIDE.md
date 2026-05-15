# Administrator Guide

Operational guide for system administrators and tenant operators managing the current Event Manager runtime.

This document is intentionally aligned to the active release-based deployment model and current route/role boundaries. It does not describe legacy direct-checkout production layouts.

## Canonical References

- Runtime layout: `docs/operations/PROD-RUNTIME-LAYOUT.md`
- Deployment procedure: `docs/operations/DEV-TO-PROD-DEPLOY-QUICK.md`
- Disaster recovery guidance: `docs/11-DISASTER-RECOVERY.md`
- Deployment details: `docs/08-DEPLOYMENT.md`

## Operational Roles

### SUPER_ADMIN

Platform-level authority. Expected uses:

- tenant management
- global administration
- database browser
- data wipe
- disaster recovery execution
- release/runtime troubleshooting

### ADMIN

Tenant administration plus selected platform-adjacent operations. Expected uses:

- users, events, contests, categories, templates
- permissions
- backups
- monitoring/performance views
- logs and cache management where permitted

### ORGANIZER

Tenant operational authority, but not full platform control. Expected uses:

- tenant-scoped event operations
- user operations where allowed
- backups
- performance monitoring
- selected settings and communications workflows

### BOARD

Governance/certification role, not a platform-operations role. Board users should not be treated as system administrators.

## Application and Service Entry Points

### Application

- Main app: `https://conmgr.com/`
- API docs: `https://conmgr.com/api-docs`

### Local service endpoints

- Production health: `http://127.0.0.1:3000/health`
- Development health: `http://127.0.0.1:3002/health`

Public ingress is usually terminated upstream and proxied internally. Use the health endpoints and systemd state as the primary truth for local runtime checks.

## Filesystem Layout

### Source and releases

- Dev workspace: `/srv/event-manager/dev`
- Release root: `/opt/event-manager/releases/<timestamp>`
- Active release symlink: `/opt/event-manager/current`

### Shared mutable data

- runtime data: `/var/lib/event-manager`
- logs: `/var/log/event-manager`
- production env: `/etc/event-manager/event-manager.env`
- development env: `/etc/event-manager/event-manager-dev.env`

Do not store or manage durable operational state in the dev workspace or assume release directories are the durable source of uploads, logs, backups, or exports.

## Service Management

### Production

```bash
sudo systemctl status event-manager.service
sudo systemctl restart event-manager.service
journalctl -u event-manager.service -f
```

### Development

```bash
sudo systemctl status event-manager-dev.service
sudo systemctl restart event-manager-dev.service
journalctl -u event-manager-dev.service -f
```

### nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Health and Runtime Validation

Minimum production validation:

```bash
systemctl is-active event-manager.service
curl -sS http://127.0.0.1:3000/health
readlink -f /opt/event-manager/current
sudo nginx -t
```

Minimum development validation:

```bash
systemctl is-active event-manager-dev.service
curl -sS http://127.0.0.1:3002/health
```

## Monitoring

### Application monitoring access

The application exposes monitoring links through the Performance page for approved roles.

Current intended access:

- Grafana auth proxy: `SUPER_ADMIN`, `ADMIN`, `ORGANIZER`
- Performance API/dashboard: `SUPER_ADMIN`, `ADMIN`, `ORGANIZER`

Board users are not part of the intended monitoring access set.

### Local operational checks

```bash
curl -sS http://127.0.0.1:3000/health
curl -sS http://127.0.0.1:3000/metrics
```

If Grafana or Prometheus are proxied separately by nginx or upstream infrastructure, validate those endpoints through the current proxy configuration rather than assuming a static standalone topology.

## Email / SMTP Settings

Administrators configure outbound email from **Admin -> Settings -> Email / SMTP Settings**.
The same settings path is the delivery foundation for:

- notification email delivery
- report delivery
- template-based email sends
- direct and bulk outbound email
- SMTP test-email validation

These settings do not replace the app's separate communication surfaces. They provide the sender and transport configuration those surfaces depend on.

## Communications Model

The current communications model is split across several surfaces with different purposes:

### Notifications

Use **Notifications** for:

- personal in-app inbox items
- email, push, and in-app notification preferences
- admin-sent in-app notifications when the role has send access

Current send access for notification broadcasting is broader than a purely technical admin audience. The live UI allows:

- `SUPER_ADMIN`
- `ADMIN`
- `ORGANIZER`
- `BOARD`

to send notifications from the Notifications page.

### Email Templates

Use **Email Templates** for:

- reusable message content
- previewing template output
- maintaining shared email bodies and subjects for repeated sends

Templates are not the same thing as the SMTP settings page, and they are not the same thing as the user notification inbox. They are reusable content assets that other send flows can use.

Current template-management access follows the live page access model:

- `SUPER_ADMIN`
- `ADMIN`
- `ORGANIZER`
- `BOARD`

### Send Email / Bulk Operations

Use **Send Email** and **Bulk Operations** for:

- direct outbound email to selected addresses
- role-targeted outbound email
- user import workflows that share the bulk-operations surface

`/send-email` is a send-focused entry into the broader bulk-operations page. It is not a separate independent implementation with different delivery rules.

### SMTP Settings

Use **Email / SMTP Settings** for:

- authenticated sender configuration
- reply-to defaults
- tenant overrides versus global defaults
- transport validation

This page controls how outbound mail is delivered. It does not replace the template editor, the send-email workflow, or the notification inbox.

### Sender fields

- **From Email Address** (`email_from_address`): the mailbox address emitted in the outbound `From` header. This should usually be a verified sender for the configured SMTP provider, such as `noreply@example.com`.
- **From Name** (`email_from_name`): the display name emitted with the sender address. When set, outbound mail is sent with a display-name sender such as `"Event Manager" <noreply@example.com>`.

From Name has existed in the settings UI for administrators. The current runtime uses it when constructing outbound mail, so changes to this field affect the visible sender name recipients see.

### Reply-To fields

- **Reply-To Email Address** (`email_reply_to_address`): optional mailbox where recipient replies should be delivered.
- **Reply-To Name** (`email_reply_to_name`): optional display name for the reply destination.

Reply-To is only added to outbound mail when a reply-to address is configured. Leaving the reply-to address blank keeps the header omitted, so replies go to the normal sender behavior determined by the mail client and provider. A reply-to name without a reply-to address is rejected because it would not produce a valid header.

Use Reply-To when outbound mail must come from a controlled sender address but replies should route to a support desk, organizer mailbox, or tenant-specific contact. Use From fields for the sender identity that SMTP providers authenticate and recipients see as the message sender.

### Tenant and global behavior

Super admins can edit global email settings or explicitly select a tenant scope. Global values act as platform defaults. Tenant-scoped values override the global defaults only for that tenant.

When a tenant does not define a sender or reply-to value, runtime resolution falls back to the global setting and then to environment SMTP defaults where applicable. Updating a tenant's Email / SMTP Settings should therefore be treated as a tenant-specific override, not a platform-wide change.

### Practical Guidance

- update SMTP settings when delivery identity or provider configuration changes
- update templates when the reusable wording or branding of a message changes
- use Send Email/Bulk Operations when you need to deliver a message now
- use Notifications when the goal is an in-app alert, notification preference management, or an admin broadcast to app users

## Backups and Recovery

### Application-level backup roles

Current backup route access:

- list/create/delete/download backups: `SUPER_ADMIN`, `ADMIN`, `ORGANIZER`, `BOARD`
- restore backup: `SUPER_ADMIN`
- backup settings: `SUPER_ADMIN`, `ADMIN`, `ORGANIZER`
- schedule/debug endpoints: `SUPER_ADMIN`

### Runtime locations

- shared backups directory: `/var/lib/event-manager/backups`
- backup runtime env override: `/var/lib/event-manager/config/backup.runtime.env`

### Notes

- Backup execution and scheduling depend on current env and settings state.
- Tenant operators may have settings visibility that differs from full restore authority.
- Restore remains a super-admin/platform operation.

## Database Administration

### Runtime expectations

- production database URL comes from `/etc/event-manager/event-manager.env`
- dev database URL comes from `/etc/event-manager/event-manager-dev.env`
- migration/admin access should use `MIGRATION_DATABASE_URL` when required

### Database browser

The low-level database browser is a `SUPER_ADMIN` function only. Tenant admins should not be treated as database-browser operators.

### Default tenant posture

The default tenant is reserved for system-management workflows and super-admin operations. Non-super-admin data in the default tenant should be treated as audit/remediation candidates.

## Docs and Help Surface

The in-app Help surface is now policy-driven.

- public docs remain public
- restricted docs require the appropriate authenticated role
- internal operational docs under `docs/operations/internal/`, `docs/testing/`, and `docs/adr/` are not part of the published Help API

Do not assume that every markdown file under `docs/` is intentionally exposed to end users.

## Authentication and Security Operations

### Environment files

- production: `/etc/event-manager/event-manager.env`
- development: `/etc/event-manager/event-manager-dev.env`

Do not place production secrets in the dev workspace.

### Default tenant and segregation

Current segregation-related env keys include:

- `TENANT_SEGREGATION_MODE`
- `TENANT_DB_RLS_MODE`
- `TENANT_DEFAULT_IDS`
- `TENANT_DEFAULT_SLUGS`

These values belong in the managed environment file, not in source control.

## Common Administrative Tasks

### Reuse contest and category structure

Use the clone/template flows when you need to reuse setup without carrying forward live operational state.

Supported patterns:

- clone a contest into another event
- clone a category into another contest
- create a contest directly from an event template
- create a category directly from a saved category template
- save a category as a reusable template
- import criteria from another category or template

Operational rules:

- clones are editable immediately after creation
- assignments are created fresh after cloning
- scores, certifications, and audit/governance state are not copied
- criteria import is append-only

Recommended workflow:

1. create the clone
2. review the cloned contest or category
3. open `Assignments` and create fresh operational assignments
4. add scoped `BOARD`, `TALLY_MASTER`, and `AUDITOR` roles where needed

See `docs/15-STRUCTURE-REUSE-GUIDE.md` for the detailed operator workflow and API summary.

### Stage and activate a release

```bash
cd /srv/event-manager/dev
npm run build
cd frontend && npm run build && cd ..
bash scripts/deploy/pwa-preflight.sh
sudo bash scripts/deploy/preflight-tenant-segregation.sh
sudo scripts/deploy/stage-release.sh
sudo scripts/deploy/activate-release.sh "$(cat /opt/event-manager/.last_release_ts)"
```

### Roll back a release

```bash
sudo scripts/deploy/rollback-release.sh
```

### Check current release target

```bash
readlink -f /opt/event-manager/current
```

### Review production logs

```bash
journalctl -u event-manager.service -f
```

### Review development logs

```bash
journalctl -u event-manager-dev.service -f
```

## Troubleshooting Priorities

When investigating an issue, start in this order:

1. service state
2. local health endpoint
3. current active release target
4. nginx validation
5. env/runtime configuration
6. application logs

Recommended commands:

```bash
systemctl status event-manager.service
curl -sS http://127.0.0.1:3000/health
readlink -f /opt/event-manager/current
sudo nginx -t
journalctl -u event-manager.service -n 200
```

## What This Guide Intentionally Does Not Assume

This guide does not assume:

- production runs from a mutable checkout
- production env lives inside `/opt/event-manager/current/.env`
- PM2 is the primary runtime
- uploads or logs are primarily managed inside the release directory

## Related Documents

- `docs/08-DEPLOYMENT.md`
- `docs/11-DISASTER-RECOVERY.md`
- `docs/operations/DEV-TO-PROD-DEPLOY-QUICK.md`
- `docs/operations/PROD-RUNTIME-LAYOUT.md`
