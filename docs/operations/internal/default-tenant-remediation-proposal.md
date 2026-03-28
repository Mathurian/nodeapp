# Default Tenant Remediation Proposal

## Purpose

Translate the default-tenant audit into an approval-ready cleanup plan before any live data mutation.

## Audit Summary

The default tenant is not currently limited to system-management-only data.

Read-only audit evidence from the dev database shows:

- `3` active `SUPER_ADMIN` users
- `1` active non-super-admin user:
  - `judge_user_ALL_REQUIRED_1771651799877@example.com` (`JUDGE`)
- Smoke/UAT event graph:
  - Event: `SMOKE_CERT_POLICY_ALL_REQUIRED`
  - Contest: `Contest ALL_REQUIRED`
  - Category: `Category ALL_REQUIRED`
- Active tenant-scoped workflow templates:
  - `Score Certification Pipeline`
  - `Score Governance Request Flow`
- Real tenant-scoped configuration stored in the default tenant:
  - Google Drive OAuth connection metadata
  - rclone remote provider settings
  - tenant branding assets (`theme_logoPath`, `theme_faviconPath`)
- Operational/default-tenant row counts:
  - `backup_logs`: `444`
  - `audit_logs`: `385`
  - `activity_logs`: `246`
  - `role_permissions`: `78`
  - `error_logs`: `74`
  - `notifications`: `24`
  - `workflow_steps`: `8`
  - `certifications`: `6`
  - `system_settings`: `8`
  - `email_logs`: `5`
  - `files`: `3`
  - `workflow_templates`: `2`
  - `report_instances`: `1`
  - `notification_preferences`: `1`

## Classification

### 1. Approved system-management accounts

Records:

- `admin@example.com`
- `admin@revnatech.com`
- `corbinolsonwork@gmail.com`

Classification:

- `Legitimate system-management data`, pending owner confirmation

Recommended action:

- Retain only if each account is still an approved super-admin breakglass or operations account.
- If any account is obsolete, disable or remove it separately from the tenant cleanup.

### 2. Smoke/UAT certification dataset

Records:

- `judge_user_ALL_REQUIRED_1771651799877@example.com`
- `SMOKE_CERT_POLICY_ALL_REQUIRED`
- `Contest ALL_REQUIRED`
- `Category ALL_REQUIRED`
- `6` certification rows
- related certification-stage notifications
- `1` system analytics report instance
- `3` tenant files, including a script document

Classification:

- `Stray UAT/demo data`

Recommended action:

- Preferred: move this dataset into a dedicated internal UAT tenant and recreate any related user assignments there.
- Acceptable fallback: export a minimal snapshot, then delete the entire smoke/UAT dataset from the default tenant.

Rationale:

- The default tenant must not host tenant-operational scoring/certification data.
- Keeping this data in `default` undermines the segregation model and creates ambiguity in admin tooling and audits.

### 3. Workflow templates and steps in the default tenant

Records:

- `Score Certification Pipeline`
- `Score Governance Request Flow`
- `8` workflow steps

Classification:

- `Seeded legacy residue` unless product explicitly requires default-tenant workflow ownership

Recommended action:

- If these are intended as platform defaults, move them to a supported global/seed mechanism.
- If they are tenant-owned operational templates, migrate them to the real tenant that owns them.
- Do not leave tenant-scoped workflow configuration in the default tenant.

### 4. Branding and off-site backup configuration

Records:

- `backup_google_drive_oauth_connected_at`
- `backup_google_drive_oauth_connected_email`
- `backup_google_drive_oauth_tokens`
- `backup_rclone_auth_mode`
- `backup_rclone_provider`
- `backup_remote_type`
- `theme_logoPath`
- `theme_faviconPath`

Classification:

- `Real tenant-scoped configuration stored in the wrong tenant`

Recommended action:

- Identify the actual tenant that owns this branding and backup target.
- Migrate non-secret settings to that tenant.
- Reconnect or rotate the OAuth tokens in the destination tenant rather than copying sensitive token material blindly.
- Remove the default-tenant copies after the destination tenant is verified.

Rationale:

- These are not neutral platform settings.
- Default-tenant storage of branding and remote-backup credentials creates the wrong ownership and failure domain.

### 5. Tenant-scoped permission overrides

Records:

- `78` `role_permissions` rows across `ADMIN`, `ORGANIZER`, `BOARD`, `JUDGE`, `CONTESTANT`, `EMCEE`, `TALLY_MASTER`, `AUDITOR`, and `SUPER_ADMIN`

Classification:

- `Legacy residue` unless the default tenant is intentionally being used as a policy tenant

Recommended action:

- Export a snapshot of the current rows.
- Verify whether any current runtime depends on these overrides.
- If not required, remove them from the default tenant.
- If required as platform defaults, move them to a supported default-policy seed path instead of tenant-owned rows.

### 6. Historical logs and notifications

Records:

- `backup_logs`
- `audit_logs`
- `activity_logs`
- `error_logs`
- `email_logs`
- `notifications`
- `notification_preferences`

Classification:

- Mostly `legacy residue` from default-tenant operations and smoke activity

Recommended action:

- Export snapshots first if retention is required.
- Remove them from the default tenant after the owning smoke/config datasets are migrated or deleted.
- Do not migrate tenant-scoped logs into another real tenant unless the records clearly belong there.

## Proposed Remediation Sequence

### Phase 1: Freeze and capture

1. Export record snapshots for:
   - `users`
   - `events`
   - `contests`
   - `categories`
   - `judges`
   - `certifications`
   - `workflow_templates`
   - `workflow_steps`
   - `role_permissions`
   - `system_settings`
   - `notifications`
   - `files`
2. Confirm which super-admin accounts should remain in the default tenant.
3. Confirm the real owner tenant for the branding and off-site backup configuration.

### Phase 2: Relocate or recreate operational data

1. Create or designate a dedicated internal UAT tenant for smoke datasets.
2. Recreate or migrate the smoke certification dataset there.
3. Recreate or migrate workflow templates there if they are tenant-owned.
4. Reconnect off-site backup and restore branding in the correct tenant.

### Phase 3: Remove residue from the default tenant

1. Disable or remove the stray default-tenant judge account.
2. Delete the smoke/UAT event graph and linked files/notifications/certifications after the target tenant is verified.
3. Remove tenant-scoped workflow templates from the default tenant after migration/reseed.
4. Remove default-tenant `role_permissions` rows if they are not part of a supported seeding mechanism.
5. Purge residual notifications and historical log rows from the default tenant after required exports.

### Phase 4: Verification

Run final validation queries and confirm:

- only approved `SUPER_ADMIN` accounts remain in the default tenant
- no tenant-scoped event/contest/category/judge/certification data remains
- no tenant-specific branding or off-site backup configuration remains
- no tenant-scoped workflow templates remain
- no unexpected permission overrides remain

## Required Approval Before Mutation

No production or shared-environment data should be mutated until the following decisions are explicitly approved:

1. Which `SUPER_ADMIN` accounts remain in the default tenant
2. Whether the smoke dataset is migrated to an internal UAT tenant or deleted
3. Which real tenant should own the current branding and backup configuration
4. Whether default-tenant `role_permissions` are deleted or converted into a supported seeded-default model

## Recommended Decision

Recommended path:

1. Keep only approved super-admin operations accounts in the default tenant
2. Move the smoke dataset into a dedicated internal UAT tenant
3. Re-home branding and backup configuration to the actual tenant that owns them, rotating secrets during the move
4. Remove all remaining tenant-scoped operational residue from the default tenant

That gives the cleanest alignment with the tenant-segregation model without depending on hidden exceptions.
